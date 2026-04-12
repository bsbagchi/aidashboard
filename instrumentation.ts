/**
 * Warm up RAG (embed chunks → Pinecone or memory) when the Node server starts,
 * so the first /api/chat request does not pay the full sync cost alone.
 */
import type { DealershipDataset } from "@/lib/dealership/types";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ ensureRagSynced }, dataMod] = await Promise.all([
    import("@/lib/rag/sync"),
    import("@/doc/dealership_data.json"),
  ]);
  const dataset = dataMod.default as DealershipDataset;

  void ensureRagSynced(dataset)
    .then(() => {
      console.info("[RAG] Background warm-up finished.");
    })
    .catch((err: unknown) => {
      console.error(
        "[RAG] Background warm-up failed:",
        err instanceof Error ? err.message : err,
      );
    });
}
