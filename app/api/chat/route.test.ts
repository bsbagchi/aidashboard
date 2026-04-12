import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/rag/sync", () => ({
  ensureRagSynced: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rag/retrieve", () => ({
  retrieveContextTexts: vi.fn().mockResolvedValue([]),
}));

/**
 * Single user message used to exercise `POST /api/chat` (Ollama path, `fetch` mocked).
 * Replace the mock stream in tests if you want a different “assistant” reply shape.
 */
export const SAMPLE_CHAT_USER_PROMPT =
  "In one short sentence, what does this dashboard help a dealership track?";

function ndjsonOllamaChatStream(chunks: string[]): Response {
  const body = chunks
    .map((text) =>
      JSON.stringify({
        message: { content: text },
      }),
    )
    .join("\n");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

async function collectSseTokens(res: Response): Promise<{
  tokens: string[];
  done: boolean;
  error?: string;
}> {
  if (!res.body) {
    throw new Error("No response body");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
  }
  const tokens: string[] = [];
  let doneEvent = false;
  let error: string | undefined;
  for (const line of full.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = JSON.parse(line.slice(6)) as {
      type?: string;
      text?: string;
      message?: string;
    };
    if (payload.type === "token" && payload.text) {
      tokens.push(payload.text);
    }
    if (payload.type === "done") doneEvent = true;
    if (payload.type === "error" && payload.message) error = payload.message;
  }
  return { tokens, done: doneEvent, error };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.stubEnv("AI_CHAT_PROVIDER", "ollama");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OLLAMA_MODEL", "llama3.2:1b");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("one user prompt → SSE stream from chat handler (Ollama mocked)", async () => {
    const mockAssistantText =
      "It helps track leads, branches, and sales performance.";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/chat")) {
        return Promise.resolve(ndjsonOllamaChatStream([mockAssistantText]));
      }
      return Promise.reject(new Error(`unexpected fetch: ${String(url)}`));
    });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: SAMPLE_CHAT_USER_PROMPT }],
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const { tokens, done, error } = await collectSseTokens(res);
    expect(error).toBeUndefined();
    expect(done).toBe(true);
    expect(tokens.join("")).toBe(mockAssistantText);
    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/chat"),
    );
    expect(call?.[1]?.body).toBeTruthy();
    const parsed = JSON.parse(String(call![1]!.body)) as {
      model: string;
      stream: boolean;
      messages: { role: string; content: string }[];
    };
    expect(parsed.stream).toBe(true);
    expect(parsed.model).toBe("llama3.2:1b");
    const userMsg = parsed.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toBe(SAMPLE_CHAT_USER_PROMPT);
  });

  it("returns 400 when messages are empty", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
