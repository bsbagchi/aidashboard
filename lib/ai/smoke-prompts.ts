/**
 * Example prompts for manual QA of chat + RAG (dealership dataset).
 * Expected: assistant answers using branches/leads from doc/dealership_data.json (or admits uncertainty).
 */

export const SMOKE_CHAT_PROMPTS: readonly string[] = [
  "List the five branch names and their cities.",
  "How many sales reps are in the dataset?",
  "Which branch is Downtown Toyota and what is its branch id?",
  "Summarize what metrics you can see for the selected date range on the dashboard.",
];

/** Shorter prompts for quick checks. */
export const SMOKE_CHAT_QUICK: readonly string[] = [
  "Reply with exactly: OK if you can read dealership context.",
  "Name one city where a branch exists.",
];
