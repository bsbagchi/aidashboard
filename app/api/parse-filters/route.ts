import { GoogleGenerativeAI } from "@google/generative-ai";
import dealershipData from "@/doc/dealership_data.json";
import {
  getBedrockBearerToken,
  getChatProvider,
  getGeminiApiKey,
} from "@/lib/ai/env";
import { bedrockConverseText } from "@/lib/bedrock/client";
import {
  isGeminiRateLimitError,
  userFacingGeminiError,
  withGeminiRetry,
} from "@/lib/ai/gemini-quota";
import type { ParseFiltersResponse } from "@/lib/ai/types";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { sanitizeUserText } from "@/lib/sanitize";
import type { DealershipDataset } from "@/lib/dealership/types";
import { ollamaGenerate } from "@/lib/ollama/client";

export const runtime = "nodejs";
export const maxDuration = 30;

const dataset = dealershipData as DealershipDataset;

export async function POST(req: Request) {
  const ip = getClientKey(req);
  const limited = rateLimit(`parse-filters:${ip}`, 30);
  if (!limited.ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const provider = getChatProvider();
  const key = getGeminiApiKey();
  if (provider === "bedrock" && !getBedrockBearerToken()) {
    return Response.json(
      { error: "AWS_BEARER_TOKEN_BEDROCK or aws_bedrock is not configured" },
      { status: 503 },
    );
  }
  if (provider !== "ollama" && provider !== "bedrock" && !key) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const q = sanitizeUserText(body.query ?? "", 2000);
  if (!q) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  const branchCatalog = dataset.branches
    .map((b) => `${b.id}: ${b.name} (${b.city})`)
    .join("\n");

  const prompt = [
    "Map the user's natural-language filter request to dashboard URL parameters.",
    "Branches:",
    branchCatalog,
    "",
    "Rules:",
    "- from/to are YYYY-MM-DD in the dataset range roughly June 2025 - December 2025.",
    "- If unsure, leave fields null and set confidence low.",
    "- branchId must be one of B1..B5 or null.",
    "",
    "User request:",
    q,
    "",
    "Return JSON ONLY:",
    '{ "from": string | null, "to": string | null, "branchId": string | null, "confidence": number, "rationale": string }',
  ].join("\n");

  try {
    let raw: string;
    if (provider === "ollama") {
      raw = await ollamaGenerate(prompt, { json: true, temperature: 0 });
    } else if (provider === "bedrock") {
      raw = await bedrockConverseText(prompt, {
        temperature: 0,
        maxTokens: 4096,
      });
    } else {
      const genAI = new GoogleGenerativeAI(key!);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_PARSE_MODEL ?? "gemini-2.0-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      });
      const res = await withGeminiRetry(() => model.generateContent(prompt), {
        label: "parse-filters",
        maxAttempts: 4,
      });
      raw = res.response.text();
    }
    const parsed = JSON.parse(raw) as ParseFiltersResponse;
    return Response.json(parsed);
  } catch (e) {
    const message =
      provider === "ollama"
        ? e instanceof Error
          ? e.message
          : "Ollama request failed"
        : provider === "bedrock"
          ? e instanceof Error
            ? e.message
            : "Bedrock request failed"
          : userFacingGeminiError(e);
    const status =
      provider === "ollama" || provider === "bedrock"
        ? 500
        : isGeminiRateLimitError(e)
          ? 503
          : 500;
    return Response.json({ error: message }, { status });
  }
}
