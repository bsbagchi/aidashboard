import {
  getOllamaBaseUrl,
  getOllamaChatModel,
  getOllamaEmbedModel,
} from "@/lib/ai/env";

function base(): string {
  return getOllamaBaseUrl().replace(/\/$/, "");
}

export async function ollamaChatStream(
  systemInstruction: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onToken: (text: string) => void,
): Promise<void> {
  const model = getOllamaChatModel();
  const ollamaMessages = [
    { role: "system" as const, content: systemInstruction },
    ...messages.slice(-12).map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
  ];
  const res = await fetch(`${base()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama chat failed (${res.status}): ${t.slice(0, 500)}`);
  }
  if (!res.body) {
    throw new Error("Ollama chat: empty response body");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed) as {
          message?: { content?: string };
        };
        const piece = json.message?.content;
        if (piece) onToken(piece);
      } catch {
        /* ignore partial lines */
      }
    }
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      const json = JSON.parse(tail) as {
        message?: { content?: string };
      };
      const piece = json.message?.content;
      if (piece) onToken(piece);
    } catch {
      /* ignore */
    }
  }
}

export async function ollamaGenerate(
  prompt: string,
  options?: { json?: boolean; temperature?: number },
): Promise<string> {
  const model = getOllamaChatModel();
  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
  };
  if (options?.json) {
    body.format = "json";
  }
  if (options?.temperature !== undefined) {
    body.options = { temperature: options.temperature };
  }
  const res = await fetch(`${base()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Ollama generate failed (${res.status}): ${t.slice(0, 500)}`,
    );
  }
  const json = (await res.json()) as { response?: string };
  return json.response ?? "";
}

export async function ollamaEmbedOne(text: string): Promise<number[]> {
  const model = getOllamaEmbedModel();
  const res = await fetch(`${base()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Ollama embeddings failed (${res.status}): ${t.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as { embedding?: number[] };
  const emb = json.embedding;
  if (!emb?.length) {
    throw new Error("Ollama embedding API returned empty values");
  }
  return emb;
}
