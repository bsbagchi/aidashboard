import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getChatProvider,
  getEmbeddingProvider,
  getOllamaBaseUrl,
} from "./env";

describe("Ollama / provider env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults chat to gemini when keys unset", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("AI_CHAT_PROVIDER", "");
    vi.stubEnv("OLLAMA_ENABLED", "");
    expect(getChatProvider()).toBe("gemini");
  });

  it("uses ollama when AI_CHAT_PROVIDER=ollama", () => {
    vi.stubEnv("AI_CHAT_PROVIDER", "ollama");
    expect(getChatProvider()).toBe("ollama");
  });

  it("normalizes AI_CHAT_PROVIDER case and whitespace", () => {
    vi.stubEnv("AI_CHAT_PROVIDER", " Ollama ");
    expect(getChatProvider()).toBe("ollama");
  });

  it("uses ollama when OLLAMA_ENABLED=true", () => {
    vi.stubEnv("AI_CHAT_PROVIDER", "");
    vi.stubEnv("OLLAMA_ENABLED", "true");
    expect(getChatProvider()).toBe("ollama");
  });

  it("defaults embedding to gemini when Gemini key present", () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubEnv("RAG_EMBEDDING_PROVIDER", "");
    expect(getEmbeddingProvider()).toBe("gemini");
  });

  it("defaults embedding to ollama when Ollama chat and no Gemini key", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_CHAT_PROVIDER", "ollama");
    vi.stubEnv("RAG_EMBEDDING_PROVIDER", "");
    expect(getEmbeddingProvider()).toBe("ollama");
  });

  it("respects explicit RAG_EMBEDDING_PROVIDER=gemini", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_CHAT_PROVIDER", "ollama");
    vi.stubEnv("RAG_EMBEDDING_PROVIDER", "gemini");
    expect(getEmbeddingProvider()).toBe("gemini");
  });

  it("defaults Ollama base URL", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    expect(getOllamaBaseUrl()).toBe("http://127.0.0.1:11434");
  });
});
