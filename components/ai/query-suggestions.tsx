"use client";

import type { ChatContextFilter } from "@/lib/ai/types";
import type { Branch } from "@/lib/dealership/types";

export function QuerySuggestionChips({
  branches,
  context,
  onPick,
}: {
  branches: Branch[];
  context: ChatContextFilter;
  onPick: (q: string) => void;
}) {
  const branchName =
    branches.find((b) => b.id === context.branchId)?.name ?? "the network";

  const suggestions = [
    `Summarize pipeline risk for ${branchName} in the selected range.`,
    "Which funnel stage loses the most volume for leads created in this window?",
    "List the top three reps by delivered revenue and why.",
    "What patterns appear in delivery delays for closed deals?",
  ];

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {suggestions.map((q) => (
        <button
          key={q}
          type="button"
          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-left text-xs text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => onPick(q)}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
