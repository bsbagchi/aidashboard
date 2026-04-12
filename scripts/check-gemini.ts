/**
 * Smoke-test Gemini API (generateContent, non-streaming).
 * Loads GEMINI_API_KEY from .env in cwd.
 * Usage: npm run check:gemini
 */
import fs from "node:fs";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("No .env file at project root.");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.trim().match(/^#?\s*(GEMINI_API_KEY|GEMINI_CHAT_MODEL)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val) process.env[m[1]] = val;
  }
}

loadEnv();

async function main() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    console.error("GEMINI_API_KEY missing in .env");
    process.exit(1);
  }
  const modelId =
    process.env.GEMINI_CHAT_MODEL?.trim() ?? "gemini-2.0-flash-lite";
  console.log(`Model: ${modelId}`);
  console.log("Calling generateContent…");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: modelId });
  const result = await model.generateContent(
    'Reply with exactly the single word "pong" and nothing else.',
  );
  const text = result.response.text().trim();
  console.log("Response:", JSON.stringify(text.slice(0, 120)));
  console.log("OK: Gemini API key works for this model.");
}

main().catch((e) => {
  console.error(
    "Gemini check failed:",
    e instanceof Error ? e.message : String(e),
  );
  process.exit(1);
});
