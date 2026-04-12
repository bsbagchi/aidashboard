import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import {
  getBedrockBearerToken,
  getBedrockModelId,
  getBedrockRegion,
} from "@/lib/ai/env";

let cachedClient: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  const token = getBedrockBearerToken();
  if (!token) {
    throw new Error(
      "Bedrock API token missing: set AWS_BEARER_TOKEN_BEDROCK or aws_bedrock",
    );
  }
  if (!cachedClient) {
    cachedClient = new BedrockRuntimeClient({
      region: getBedrockRegion(),
      token: async () => ({ token }),
      authSchemePreference: ["smithy.api#httpBearerAuth"],
    });
  }
  return cachedClient;
}

function extractAssistantText(out: ConverseCommandOutput): string {
  const msg = out.output?.message;
  if (!msg?.content) return "";
  const parts: string[] = [];
  for (const block of msg.content) {
    if (
      block &&
      typeof block === "object" &&
      "text" in block &&
      typeof (block as { text?: string }).text === "string"
    ) {
      parts.push((block as { text: string }).text);
    }
  }
  return parts.join("");
}

export async function bedrockConverseText(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const client = getBedrockClient();
  const cmd = new ConverseCommand({
    modelId: getBedrockModelId(),
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: {
      maxTokens: options?.maxTokens ?? 8192,
      temperature: options?.temperature ?? 0.3,
    },
  });
  const out = await client.send(cmd);
  return extractAssistantText(out);
}

export async function bedrockConverseStream(
  systemInstruction: string,
  messages: { role: "user" | "assistant"; content: string }[],
  onToken: (text: string) => void,
  options?: { temperature?: number; maxTokens?: number },
): Promise<void> {
  const client = getBedrockClient();
  const recent = messages.slice(-12);
  const cmd = new ConverseStreamCommand({
    modelId: getBedrockModelId(),
    system: [{ text: systemInstruction }],
    messages: recent.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    inferenceConfig: {
      maxTokens: options?.maxTokens ?? 8192,
      temperature: options?.temperature ?? 0.3,
    },
  });
  const out = await client.send(cmd);
  const stream = out.stream;
  if (!stream) {
    throw new Error("Bedrock ConverseStream: empty stream");
  }
  for await (const event of stream) {
    if (!event.contentBlockDelta?.delta) continue;
    const d = event.contentBlockDelta.delta;
    if ("text" in d && typeof d.text === "string" && d.text) {
      onToken(d.text);
    }
  }
}
