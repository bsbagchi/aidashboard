import { GoogleGenerativeAI } from "@google/generative-ai";
import dealershipData from "@/doc/dealership_data.json";
import { getChatProvider, getGeminiApiKey } from "@/lib/ai/env";
import { buildAnalyticsSummaryJson } from "@/lib/ai/analytics-summary";
import { withGeminiRetry } from "@/lib/ai/gemini-quota";
import { buildFallbackInsights } from "@/lib/ai/fallback-insights";
import { parseJsonFromModelText } from "@/lib/ai/parse-model-json";
import type { InsightsResponse } from "@/lib/ai/types";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { parseRangeFromQuery } from "@/lib/dealership/dates";
import type { DealershipDataset } from "@/lib/dealership/types";
import { ollamaGenerate } from "@/lib/ollama/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const dataset = dealershipData as DealershipDataset;

export async function POST(req: Request) {
  const ip = getClientKey(req);
  const limited = rateLimit(`insights:${ip}`, 12);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  const provider = getChatProvider();
  const key = getGeminiApiKey();
  if (provider !== "ollama" && !key) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  let body: { from?: string; to?: string; branchId?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const from = body.from ?? "2025-06-01";
  const to = body.to ?? "2025-12-31";
  const range = parseRangeFromQuery(from, to);
  let branchId: string | null = body.branchId ?? null;
  if (branchId && !dataset.branches.some((b) => b.id === branchId)) {
    branchId = null;
  }

  const summary = buildAnalyticsSummaryJson(dataset, range, branchId);

  const prompt = [
    "You are an automotive retail COO. Given structured analytics JSON, produce executive-ready insights.",
    "Return JSON ONLY matching this TypeScript interface:",
    "{ summary: string; bullets: string[]; risks: string[]; opportunities: string[]; suggestedQueries: string[] }",
    "suggestedQueries: 4 short natural-language questions users could ask the AI chat next.",
    "Be specific to branches/leads in the data. No markdown fences.",
    "",
    "DATA:",
    JSON.stringify(summary),
  ].join("\n");

  try {
    let raw: string;
    if (provider === "ollama") {
      raw = await ollamaGenerate(prompt, { json: true, temperature: 0.3 });
    } else {
      const genAI = new GoogleGenerativeAI(key!);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_INSIGHTS_MODEL ?? "gemini-2.0-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });
      const res = await withGeminiRetry(() => model.generateContent(prompt), {
        label: "insights",
        maxAttempts: 4,
      });
      raw = res.response.text();
    }
    if (!raw?.trim()) {
      return Response.json(buildFallbackInsights(summary));
    }

    let parsed: Partial<InsightsResponse>;
    try {
      parsed = parseJsonFromModelText(raw) as Partial<InsightsResponse>;
    } catch {
      console.warn("[insights] Model returned non-JSON; using deterministic fallback.");
      return Response.json(buildFallbackInsights(summary));
    }

    if (!parsed.bullets || !Array.isArray(parsed.bullets)) {
      return Response.json(buildFallbackInsights(summary));
    }

    const payload: InsightsResponse = {
      summary: parsed.summary ?? "",
      bullets: parsed.bullets,
      risks: parsed.risks ?? [],
      opportunities: parsed.opportunities ?? [],
      suggestedQueries: parsed.suggestedQueries ?? [],
    };
    return Response.json(payload);
  } catch (e) {
    console.warn("[insights] AI request failed; using deterministic fallback.", e);
    return Response.json(buildFallbackInsights(summary));
  }
}
