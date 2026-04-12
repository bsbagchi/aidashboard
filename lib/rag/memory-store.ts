import { cosineSimilarity } from "./cosine";

export interface VectorRecord {
  id: string;
  values: number[];
  text: string;
}

export class MemoryVectorStore {
  private records: VectorRecord[] = [];

  async replaceAll(items: VectorRecord[]): Promise<void> {
    this.records = items;
  }

  async query(
    vector: number[],
    topK: number,
  ): Promise<{ id: string; text: string; score: number }[]> {
    const scored = this.records.map((r) => ({
      id: r.id,
      text: r.text,
      score: cosineSimilarity(vector, r.values),
    }));
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  size(): number {
    return this.records.length;
  }
}
