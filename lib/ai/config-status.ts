import {
  getAnthropicApiKey,
  getBedrockModelId,
  getChatProvider,
  getEmbeddingProvider,
  getGeminiApiKey,
  getOllamaChatModel,
  getOllamaEmbedModel,
  getPineconeIndexName,
  isBedrockConfigured,
  getVectorDbApiKey,
} from "@/lib/ai/env";

/** Safe snapshot for health checks — never includes secret values. */
export function getPublicAiConfigSnapshot(): {
  geminiConfigured: boolean;
  anthropicConfigured: boolean;
  bedrockConfigured: boolean;
  chatProvider: "gemini" | "anthropic" | "ollama" | "bedrock";
  embeddingProvider: "gemini" | "ollama";
  pineconeConfigured: boolean;
  pineconeIndexName: string;
  models: {
    chat: string;
    insights: string;
    parse: string;
    embedding: string;
  };
  ragForceMemory: boolean;
} {
  const chatProvider = getChatProvider();
  const embeddingProvider = getEmbeddingProvider();
  const geminiChat =
    process.env.GEMINI_CHAT_MODEL ?? "gemini-2.0-flash-lite";
  const ollamaChat = getOllamaChatModel();
  return {
    geminiConfigured: Boolean(getGeminiApiKey()),
    anthropicConfigured: Boolean(getAnthropicApiKey()),
    bedrockConfigured: isBedrockConfigured(),
    chatProvider,
    embeddingProvider,
    pineconeConfigured: Boolean(getVectorDbApiKey()),
    pineconeIndexName: getPineconeIndexName(),
    models: {
      chat:
        chatProvider === "ollama"
          ? ollamaChat
          : chatProvider === "bedrock"
            ? getBedrockModelId()
            : chatProvider === "anthropic"
              ? process.env.ANTHROPIC_CHAT_MODEL ?? "claude-3-5-sonnet-20241022"
              : geminiChat,
      insights:
        chatProvider === "ollama"
          ? ollamaChat
          : chatProvider === "bedrock"
            ? getBedrockModelId()
            : process.env.GEMINI_INSIGHTS_MODEL ?? "gemini-2.0-flash-lite",
      parse:
        chatProvider === "ollama"
          ? ollamaChat
          : chatProvider === "bedrock"
            ? getBedrockModelId()
            : process.env.GEMINI_PARSE_MODEL ?? "gemini-2.0-flash-lite",
      embedding:
        embeddingProvider === "ollama"
          ? getOllamaEmbedModel()
          : process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
    },
    ragForceMemory:
      process.env.RAG_FORCE_MEMORY === "1" ||
      process.env.RAG_FORCE_MEMORY === "true",
  };
}
