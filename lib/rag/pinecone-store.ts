import { Pinecone } from "@pinecone-database/pinecone";
import {
  getPineconeIndexName,
  getVectorDbApiKey,
} from "@/lib/ai/env";

const NAMESPACE = "dealership";

export const PINECONE_METADATA_TEXT_KEY = "text";

export function createPineconeIndex() {
  const apiKey = getVectorDbApiKey();
  if (!apiKey) return null;
  const pc = new Pinecone({ apiKey });
  return pc.index(getPineconeIndexName());
}

export async function pineconeUpsertVectors(
  items: { id: string; values: number[]; text: string }[],
): Promise<void> {
  const index = createPineconeIndex();
  if (!index) throw new Error("Vector DB not configured");
  const maxMeta = 36_000;
  await index.namespace(NAMESPACE).upsert({
    records: items.map((it) => ({
      id: it.id,
      values: it.values,
      metadata: {
        [PINECONE_METADATA_TEXT_KEY]: it.text.slice(0, maxMeta),
      },
    })),
  });
}

export async function pineconeQuery(
  vector: number[],
  topK: number,
): Promise<{ id: string; text: string; score: number }[]> {
  const index = createPineconeIndex();
  if (!index) throw new Error("Vector DB not configured");
  const res = await index.namespace(NAMESPACE).query({
    vector,
    topK,
    includeMetadata: true,
  });
  const out: { id: string; text: string; score: number }[] = [];
  for (const m of res.matches ?? []) {
    const text = m.metadata?.[PINECONE_METADATA_TEXT_KEY];
    if (typeof text === "string" && m.id) {
      out.push({
        id: m.id,
        text,
        score: m.score ?? 0,
      });
    }
  }
  return out;
}

/** -1 means the index does not exist (404); do not call upsert. */
export async function pineconeApproxCount(): Promise<number> {
  const index = createPineconeIndex();
  if (!index) return 0;
  try {
    const stats = await index.describeIndexStats();
    const ns = stats.namespaces?.[NAMESPACE];
    return ns?.recordCount ?? 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/404|not\s*found|NotFound/i.test(msg)) {
      return -1;
    }
    throw e;
  }
}
