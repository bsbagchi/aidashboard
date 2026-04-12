import dealershipData from "@/doc/dealership_data.json";
import { embedQuery } from "./embeddings";
import { pineconeQuery } from "./pinecone-store";
import {
  disablePineconeAndResync,
  getMemoryStore,
  isPineconeActive,
} from "./sync";
import type { DealershipDataset } from "@/lib/dealership/types";

const dataset = dealershipData as DealershipDataset;

export async function retrieveContextTexts(
  query: string,
  topK: number,
): Promise<{ text: string; score: number }[]> {
  const qv = await embedQuery(query);

  if (isPineconeActive()) {
    try {
      return await pineconeQuery(qv, topK);
    } catch (e) {
      console.warn(
        "[RAG] Pinecone query failed; rebuilding in-memory index once.",
        e,
      );
      await disablePineconeAndResync(dataset);
    }
  }

  const mem = getMemoryStore();
  if (!mem || mem.size() < 1) {
    throw new Error("RAG memory store is not initialized");
  }
  return mem.query(qv, topK);
}
