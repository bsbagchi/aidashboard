import { getPublicAiConfigSnapshot } from "@/lib/ai/config-status";

export const runtime = "nodejs";

/**
 * GET /api/ai-health — configuration snapshot (no API keys, no external calls).
 * Use to verify env before testing chat/insights.
 */
export async function GET() {
  const config = getPublicAiConfigSnapshot();
  const ok =
    config.chatProvider === "anthropic"
      ? config.anthropicConfigured
      : config.chatProvider === "bedrock"
        ? config.bedrockConfigured
        : config.chatProvider === "ollama"
          ? true
          : config.geminiConfigured;

  const hint = !ok
    ? "Set GEMINI_API_KEY, or ANTHROPIC_API_KEY + AI_CHAT_PROVIDER=anthropic, or AWS_BEARER_TOKEN_BEDROCK + AI_CHAT_PROVIDER=bedrock, or local Ollama (AI_CHAT_PROVIDER=ollama)."
    : config.chatProvider === "ollama"
      ? "Using local Ollama; ensure the daemon is running and models are pulled (e.g. ollama pull llama3.2:1b)."
      : config.chatProvider === "bedrock"
        ? "Using Amazon Bedrock (Bearer token); ensure BEDROCK_REGION and BEDROCK_CHAT_MODEL match your account."
        : config.embeddingProvider === "ollama"
          ? "Chat uses cloud; RAG embeddings use Ollama — pull the embed model (e.g. ollama pull nomic-embed-text)."
          : "Keys present; live Gemini/Anthropic calls still depend on quota/billing.";

  return Response.json(
    {
      ok,
      status: ok ? "ready" : "misconfigured",
      hint,
      config,
    },
    { status: ok ? 200 : 503 },
  );
}
