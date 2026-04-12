/**
 * One-off: verify Bedrock bearer token + region + model ID via Converse.
 * Reads .env from cwd; picks up aws_bedrock / AWS_BEARER_TOKEN_BEDROCK even if the line is # commented.
 * Run from project root: npx tsx --tsconfig tsconfig.json scripts/check-bedrock.ts
 */
import fs from "node:fs";
import path from "node:path";

function applyEnvFromDotenv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("No .env file found at project root.");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (let line of raw.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#!")) continue;
    const uncom = line.replace(/^#\s*/, "");
    const m = uncom.match(
      /^(AWS_BEARER_TOKEN_BEDROCK|aws_bedrock|BEDROCK_REGION|BEDROCK_CHAT_MODEL)=(.*)$/,
    );
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val) process.env[key] = val;
  }
}

applyEnvFromDotenv();

async function main() {
  const token =
    process.env.AWS_BEARER_TOKEN_BEDROCK?.trim() ||
    process.env.aws_bedrock?.trim();
  if (!token) {
    console.error(
      "Missing Bedrock token. Set aws_bedrock or AWS_BEARER_TOKEN_BEDROCK in .env (can be on a # commented line for this script).",
    );
    process.exit(1);
  }
  process.env.AWS_BEARER_TOKEN_BEDROCK = token;

  const { bedrockConverseText } = await import("../lib/bedrock/client");
  const region =
    process.env.BEDROCK_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    "us-east-1";
  const model =
    process.env.BEDROCK_CHAT_MODEL?.trim() ||
    "global.anthropic.claude-haiku-4-5-20251001-v1:0";

  console.log(`Region: ${region}`);
  console.log(`Model:  ${model}`);
  console.log("Calling Bedrock Converse (short prompt)…");

  const text = await bedrockConverseText(
    'Reply with exactly the word "pong" and nothing else.',
    { maxTokens: 32, temperature: 0 },
  );
  console.log("Response:", JSON.stringify(text.slice(0, 200)));
  console.log("OK: Bedrock API accepted the key and returned a completion.");
}

main().catch((e) => {
  console.error("Bedrock check failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
