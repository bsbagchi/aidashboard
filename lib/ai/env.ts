/**
 * Server-only environment helpers. Keys must never be exposed to the client.
 */
export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.gemini_api_key
  );
}

export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

/** Pinecone API key or generic vector DB key (alias). */
export function getVectorDbApiKey(): string | undefined {
  return (
    process.env.PINECONE_API_KEY ??
    process.env.VECTORDB_API_KEY ??
    process.env.vectordb_key ??
    process.env.vector_database_key
  );
}

export function getPineconeIndexName(): string {
  return process.env.PINECONE_INDEX_NAME ?? "dealership-rag";
}

export type ChatProvider = "gemini" | "anthropic" | "ollama" | "bedrock";

export type EmbeddingProvider = "gemini" | "ollama";

function normalizeChatProviderToken(
  raw: string | undefined,
): ChatProvider | undefined {
  if (raw == null || raw === "") return undefined;
  const t = raw.trim().toLowerCase();
  if (t === "anthropic" || t === "gemini" || t === "ollama" || t === "bedrock")
    return t;
  return undefined;
}

function normalizeEmbeddingProviderToken(
  raw: string | undefined,
): EmbeddingProvider | undefined {
  if (raw == null || raw === "") return undefined;
  const t = raw.trim().toLowerCase();
  if (t === "ollama" || t === "gemini") return t;
  return undefined;
}

/** Local Ollama HTTP API (default http://127.0.0.1:11434). No trailing slash. */
export function getOllamaBaseUrl(): string {
  let raw =
    process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  raw = raw.replace(/\/$/, "");
  // Fix common typo: `http://host/:11434` parses as port 80 + path `/:11434`, not port 11434.
  raw = raw.replace(/^([^:]+:\/\/[^/]+)\/:(\d+)$/, "$1:$2");
  return raw;
}

/** Chat / generate model (e.g. llama3.2:1b, phi3:mini). */
export function getOllamaChatModel(): string {
  return process.env.OLLAMA_MODEL ?? "llama3.2:1b";
}

/** Embedding model (e.g. nomic-embed-text — typically 768 dimensions). */
export function getOllamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
}

/**
 * Amazon Bedrock long-term API key (Bearer). Prefer AWS_BEARER_TOKEN_BEDROCK per AWS docs;
 * `aws_bedrock` is supported as an alias.
 */
export function getBedrockBearerToken(): string | undefined {
  const raw =
    process.env.AWS_BEARER_TOKEN_BEDROCK?.trim() ||
    process.env.aws_bedrock?.trim() ||
    process.env.AWS_BEDROCK_API_KEY?.trim();
  if (!raw) return undefined;
  return raw.replace(/^["']|["']$/g, "");
}

export function getBedrockRegion(): string {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.BEDROCK_REGION?.trim() ||
    "us-east-1"
  );
}

/**
 * Model ID for Converse — typically an **inference profile** (global / us / eu) per Bedrock console.
 * Default: **Claude Haiku 4.5** (cheaper/faster than Opus). Override with `BEDROCK_CHAT_MODEL`.
 *
 * Examples:
 * - Haiku 4.5 (global): `global.anthropic.claude-haiku-4-5-20251001-v1:0`
 * - Opus 4.5 (global): `global.anthropic.claude-opus-4-5-20251101-v1:0`
 *
 * Marketplace / payment errors affect model access until billing is set in AWS — switching tier does not bypass that.
 */
export function getBedrockModelId(): string {
  return (
    process.env.BEDROCK_CHAT_MODEL?.trim() ||
    "global.anthropic.claude-haiku-4-5-20251001-v1:0"
  );
}

export function isBedrockConfigured(): boolean {
  return Boolean(getBedrockBearerToken());
}

export function isOllamaChatEnabled(): boolean {
  if (normalizeChatProviderToken(process.env.AI_CHAT_PROVIDER) === "ollama") {
    return true;
  }
  return (
    process.env.OLLAMA_ENABLED === "true" ||
    process.env.OLLAMA_ENABLED === "1"
  );
}

export function getChatProvider(): ChatProvider {
  const explicit = normalizeChatProviderToken(process.env.AI_CHAT_PROVIDER);
  if (explicit) return explicit;
  if (isOllamaChatEnabled()) return "ollama";
  if (getAnthropicApiKey() && !getGeminiApiKey()) return "anthropic";
  return "gemini";
}

/**
 * RAG embeddings: Gemini (3072-d default) or Ollama (model-dependent, e.g. 768 for nomic-embed-text).
 * If unset and Ollama is the chat backend with no Gemini key, defaults to ollama so RAG works locally.
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const explicit = normalizeEmbeddingProviderToken(
    process.env.RAG_EMBEDDING_PROVIDER,
  );
  if (explicit) return explicit;
  if (isOllamaChatEnabled() && !getGeminiApiKey()) return "ollama";
  return "gemini";
}

/** RAG indexing scope: `full` embeds leads + deliveries; `minimal` only metadata, branches, targets (fewer embed calls, less detail). */
export type RagChunkScope = "full" | "minimal";

export function getRagChunkScope(): RagChunkScope {
  const raw = process.env.RAG_CHUNK_SCOPE?.trim().toLowerCase();
  if (raw === "minimal" || raw === "defaults") return "minimal";
  return "full";
}
