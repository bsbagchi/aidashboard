/**
 * Lightweight intent routing: fast heuristics + optional tiny LLM classify (Ollama).
 */

export type ChatIntent =
  | "general"
  | "top_reps"
  | "kpis"
  | "stale_leads"
  | "funnel"
  | "branches";

const PATTERNS: { intent: Exclude<ChatIntent, "general">; re: RegExp }[] = [
  {
    intent: "top_reps",
    re: /top\s*(three|3|five|5|\d+)?\s*(rep|reps|salespeople|performers)|rep.*(revenue|delivered)|leaderboard|best\s*rep|highest\s*(sales|revenue)|rank.*rep/i,
  },
  {
    intent: "kpis",
    re: /overview|kpi|key\s*metrics|summary|pipeline(\s+value|\s+open)?|how\s+many\s+leads|total\s+(revenue|deliver)/i,
  },
  {
    intent: "stale_leads",
    re: /stale|no\s*activity|inactive|neglected|follow[\s-]*up/i,
  },
  {
    intent: "funnel",
    re: /funnel|stage|conversion|drop[\s-]*off|lost\s*(at|in)/i,
  },
  {
    intent: "branches",
    re: /branch(es)?\s*(compare|comparison|performance|rank)|which\s*branch|per\s*branch|each\s*branch/i,
  },
];

/**
 * Fast path — no network. First matching pattern wins.
 */
export function classifyIntentHeuristic(query: string): ChatIntent {
  const q = query.trim();
  if (q.length < 2) return "general";
  for (const { intent, re } of PATTERNS) {
    if (re.test(q)) return intent;
  }
  return "general";
}

export function shouldUseLlmIntentFallback(): boolean {
  const v = process.env.CHAT_INTENT_LLM?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Optional: small Ollama JSON classify when heuristic returned `general`.
 * Uses same Ollama base URL as chat/embeddings.
 */
export async function classifyIntentLlm(
  query: string,
): Promise<ChatIntent | null> {
  const { ollamaGenerate } = await import("@/lib/ollama/client");
  const raw = await ollamaGenerate(
    `You are a classifier. Given the user message, reply with ONLY valid JSON: {"intent":"general"|"top_reps"|"kpis"|"stale_leads"|"funnel"|"branches"}
Rules: top_reps = rankings, best reps, revenue by rep. kpis = high-level numbers. stale_leads = inactive leads. funnel = stages. branches = compare branches.
User message: ${query.slice(0, 500)}`,
    { json: true, temperature: 0 },
  );
  try {
    const j = JSON.parse(raw.trim()) as { intent?: string };
    const i = j.intent;
    if (
      i === "top_reps" ||
      i === "kpis" ||
      i === "stale_leads" ||
      i === "funnel" ||
      i === "branches" ||
      i === "general"
    ) {
      return i;
    }
  } catch {
    /* ignore */
  }
  return null;
}
