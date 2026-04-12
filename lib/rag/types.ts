export interface RagChunk {
  id: string;
  text: string;
  metadata: Record<string, string>;
}
