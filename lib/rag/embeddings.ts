import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import {
  getEmbeddingProvider,
  getGeminiApiKey,
} from "@/lib/ai/env";
import { ollamaEmbedOne } from "@/lib/ollama/client";

/**
 * `text-embedding-004` is not available for embedContent on the v1beta Generative Language API (404).
 * Use `gemini-embedding-001` (see https://ai.google.dev/gemini-api/docs/embeddings).
 * Default output is 3072 dimensions — Pinecone index dimension must match (or use in-memory RAG).
 *
 * With `RAG_EMBEDDING_PROVIDER=ollama`, vectors use `OLLAMA_EMBED_MODEL` (e.g. nomic-embed-text, often 768-d).
 */
function getEmbeddingModelName(): string {
  return process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
}

function embeddingConcurrency(): number {
  const n = Number(process.env.GEMINI_EMBED_CONCURRENCY ?? "2");
  return Number.isFinite(n) && n >= 1 ? Math.min(8, Math.floor(n)) : 2;
}

function batchDelayMs(): number {
  const n = Number(process.env.GEMINI_EMBED_BATCH_DELAY_MS ?? "150");
  return Number.isFinite(n) && n >= 0 ? Math.min(5000, n) : 150;
}

function isRateLimited(e: unknown): boolean {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status?: number }).status;
    if (s === 429) return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /429|Too Many Requests|quota|rate.?limit/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedOne(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  text: string,
  taskType: TaskType,
): Promise<number[]> {
  const maxAttempts = Number(process.env.GEMINI_EMBED_MAX_RETRIES ?? "6");
  let backoffMs = Number(process.env.GEMINI_EMBED_RETRY_BASE_MS ?? "2000");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const r = await model.embedContent({
        content: { role: "user", parts: [{ text }] },
        taskType,
      });
      const values = r.embedding?.values;
      if (!values?.length) {
        throw new Error("Embedding API returned empty values");
      }
      return [...values];
    } catch (e) {
      if (!isRateLimited(e) || attempt >= maxAttempts - 1) {
        throw e;
      }
      console.warn(
        `[RAG] Embedding rate-limited (429); retry ${attempt + 1}/${maxAttempts} in ${backoffMs}ms`,
      );
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 120_000);
    }
  }
  throw new Error("Embedding retries exhausted");
}

function ollamaEmbedConcurrency(): number {
  const n = Number(process.env.OLLAMA_EMBED_CONCURRENCY ?? "2");
  return Number.isFinite(n) && n >= 1 ? Math.min(8, Math.floor(n)) : 2;
}

async function embedTextsOllama(texts: string[]): Promise<number[][]> {
  const concurrency = ollamaEmbedConcurrency();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const embedded = await Promise.all(
      batch.map((t) => ollamaEmbedOne(t)),
    );
    out.push(...embedded);
  }
  return out;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (getEmbeddingProvider() === "ollama") {
    return embedTextsOllama(texts);
  }
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: getEmbeddingModelName() });
  const out: number[][] = [];
  const concurrency = embeddingConcurrency();
  const delayBetweenBatches = batchDelayMs();

  for (let i = 0; i < texts.length; i += concurrency) {
    if (i > 0 && delayBetweenBatches > 0) {
      await sleep(delayBetweenBatches);
    }
    const batch = texts.slice(i, i + concurrency);
    const embedded = await Promise.all(
      batch.map((t) =>
        embedOne(model, t, TaskType.RETRIEVAL_DOCUMENT),
      ),
    );
    out.push(...embedded);
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  if (getEmbeddingProvider() === "ollama") {
    return ollamaEmbedOne(text);
  }
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: getEmbeddingModelName() });
  return embedOne(model, text, TaskType.RETRIEVAL_QUERY);
}
