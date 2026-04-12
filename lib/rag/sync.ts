import type { DealershipDataset } from "@/lib/dealership/types";
import { getVectorDbApiKey } from "@/lib/ai/env";
import { buildRagChunks } from "./chunks";
import { embedTexts } from "./embeddings";
import { MemoryVectorStore } from "./memory-store";
import {
  pineconeApproxCount,
  pineconeUpsertVectors,
} from "./pinecone-store";

const g = globalThis as unknown as {
  __ragMemory?: MemoryVectorStore;
  __ragSynced?: boolean;
  __ragSyncPromise?: Promise<void>;
  /** Set when Pinecone index is missing or any Pinecone call fails; use in-memory RAG instead. */
  __ragPineconeDisabled?: boolean;
};

export function isPineconeActive(): boolean {
  if (process.env.RAG_FORCE_MEMORY === "1" || process.env.RAG_FORCE_MEMORY === "true") {
    return false;
  }
  return Boolean(getVectorDbApiKey()) && !g.__ragPineconeDisabled;
}

async function syncPinecone(data: DealershipDataset): Promise<void> {
  const chunks = buildRagChunks(data);
  const vectors = await embedTexts(chunks.map((c) => c.text));
  await pineconeUpsertVectors(
    chunks.map((c, i) => ({
      id: c.id,
      values: [...vectors[i]!],
      text: c.text,
    })),
  );
}

async function syncMemory(data: DealershipDataset): Promise<void> {
  if (!g.__ragMemory) g.__ragMemory = new MemoryVectorStore();
  const chunks = buildRagChunks(data);
  const vectors = await embedTexts(chunks.map((c) => c.text));
  await g.__ragMemory.replaceAll(
    chunks.map((c, i) => ({
      id: c.id,
      values: [...vectors[i]!],
      text: c.text,
    })),
  );
}

async function doSync(data: DealershipDataset): Promise<void> {
  const chunks = buildRagChunks(data);
  const expected = chunks.length;
  const tryPinecone = isPineconeActive();

  if (tryPinecone) {
    try {
      const count = await pineconeApproxCount();
      if (count === -1) {
        console.warn(
          "[RAG] Pinecone index not found (check PINECONE_INDEX_NAME). Using in-memory vectors.",
        );
        g.__ragPineconeDisabled = true;
      } else if (count < Math.max(1, Math.floor(expected * 0.85))) {
        await syncPinecone(data);
        return;
      } else {
        return;
      }
    } catch (e) {
      console.warn(
        "[RAG] Pinecone sync failed (missing index, quota, or embedding API). Using in-memory vectors if possible.",
        e,
      );
      g.__ragPineconeDisabled = true;
    }
  }

  if (!g.__ragMemory) g.__ragMemory = new MemoryVectorStore();
  if (g.__ragMemory.size() < 1) {
    await syncMemory(data);
  }
}

/**
 * Idempotent: embeds dealership chunks into Pinecone (if configured) or in-memory vectors.
 */
export async function ensureRagSynced(data: DealershipDataset): Promise<void> {
  if (g.__ragSynced) return;
  if (!g.__ragSyncPromise) {
    g.__ragSyncPromise = doSync(data)
      .then(() => {
        g.__ragSynced = true;
      })
      .finally(() => {
        g.__ragSyncPromise = undefined;
      });
  }
  await g.__ragSyncPromise;
}

/**
 * After a Pinecone failure at query time, rebuild vectors in memory (requires dataset).
 */
export async function disablePineconeAndResync(
  data: DealershipDataset,
): Promise<void> {
  g.__ragPineconeDisabled = true;
  g.__ragSynced = false;
  g.__ragSyncPromise = undefined;
  await ensureRagSynced(data);
}

export function getMemoryStore(): MemoryVectorStore | undefined {
  return g.__ragMemory;
}
