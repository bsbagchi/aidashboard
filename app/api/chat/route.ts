import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import dealershipData from "@/doc/dealership_data.json";
import {
  type ChatProvider,
  getAnthropicApiKey,
  getChatProvider,
  getGeminiApiKey,
} from "@/lib/ai/env";
import { userFacingGeminiError, withGeminiRetry } from "@/lib/ai/gemini-quota";
import { ollamaChatStream } from "@/lib/ollama/client";
import { buildRagSystemInstruction } from "@/lib/ai/prompts";
import type { ChatContextFilter } from "@/lib/ai/types";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { retrieveContextTexts } from "@/lib/rag/retrieve";
import { ensureRagSynced } from "@/lib/rag/sync";
import { sanitizeUserText } from "@/lib/sanitize";
import type { DealershipDataset } from "@/lib/dealership/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const dataset = dealershipData as DealershipDataset;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function filterSummary(ctx: ChatContextFilter | undefined): string {
  if (!ctx) return "full dataset (default range)";
  const b = ctx.branchId
    ? dataset.branches.find((x) => x.id === ctx.branchId)?.name ?? ctx.branchId
    : "all branches";
  return `date range ${ctx.from} to ${ctx.to}; branch scope: ${b}`;
}

async function streamGemini(
  systemInstruction: string,
  messages: IncomingMessage[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const key = getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL ?? "gemini-2.0-flash-lite",
    systemInstruction,
  });
  const recent = messages.slice(-12);
  const last = recent[recent.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("Last message must be from the user");
  }
  const history = recent.slice(0, -1).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));
  const chat = model.startChat({ history });
  const result = await withGeminiRetry(
    () => chat.sendMessageStream(last.content),
    { label: "chat-stream", maxAttempts: 5 },
  );
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "token", text })}\n\n`,
        ),
      );
    }
  }
}

async function streamAnthropic(
  systemInstruction: string,
  messages: IncomingMessage[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const key = getAnthropicApiKey();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  const client = new Anthropic({ apiKey: key });
  const recent = messages.slice(-12);
  const anthropicMessages = recent.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const stream = await client.messages.stream({
    model: process.env.ANTHROPIC_CHAT_MODEL ?? "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    system: systemInstruction,
    messages: anthropicMessages,
  });
  for await (const ev of stream) {
    if (
      ev.type === "content_block_delta" &&
      ev.delta.type === "text_delta" &&
      ev.delta.text
    ) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "token", text: ev.delta.text })}\n\n`,
        ),
      );
    }
  }
}

function userFacingChatError(e: unknown, provider: ChatProvider): string {
  if (provider === "ollama") {
    return e instanceof Error ? e.message : "Ollama request failed";
  }
  return userFacingGeminiError(e);
}

async function streamOllama(
  systemInstruction: string,
  messages: IncomingMessage[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  await ollamaChatStream(systemInstruction, messages, (text) => {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "token", text })}\n\n`,
      ),
    );
  });
}

export async function POST(req: Request) {
  const ip = getClientKey(req);
  const limited = rateLimit(`chat:${ip}`, 24);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) },
      },
    );
  }

  let body: {
    messages?: IncomingMessage[];
    context?: ChatContextFilter;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages[] is required" }, { status: 400 });
  }
  for (const m of messages) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string"
    ) {
      return Response.json({ error: "Invalid message shape" }, { status: 400 });
    }
  }

  const sanitized: IncomingMessage[] = messages.map((m, i) =>
    m.role === "user" && i === messages.length - 1
      ? { ...m, content: sanitizeUserText(m.content) }
      : m,
  );

  const lastUser = [...sanitized].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return Response.json({ error: "No user message" }, { status: 400 });
  }

  const provider = getChatProvider();
  if (provider === "gemini" && !getGeminiApiKey()) {
    return Response.json(
      { error: "Server misconfigured: GEMINI_API_KEY missing" },
      { status: 503 },
    );
  }
  if (provider === "anthropic" && !getAnthropicApiKey()) {
    return Response.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY missing" },
      { status: 503 },
    );
  }
  let chunks: string[] = [];
  try {
    await ensureRagSynced(dataset);
    const hits = await retrieveContextTexts(lastUser.content, 14);
    chunks = hits.map((h) => h.text);
  } catch (e) {
    console.warn(
      "[chat] RAG unavailable (Pinecone/embeddings); answering without retrieved chunks.",
      e,
    );
  }

  try {
    const systemInstruction = buildRagSystemInstruction(
      filterSummary(body.context),
      chunks,
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (provider === "anthropic") {
            await streamAnthropic(
              systemInstruction,
              sanitized,
              encoder,
              controller,
            );
          } else if (provider === "ollama") {
            await streamOllama(
              systemInstruction,
              sanitized,
              encoder,
              controller,
            );
          } else {
            await streamGemini(
              systemInstruction,
              sanitized,
              encoder,
              controller,
            );
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
          );
          controller.close();
        } catch (e) {
          const message = userFacingChatError(e, provider);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

