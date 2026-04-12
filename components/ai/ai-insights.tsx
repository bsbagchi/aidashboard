"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { InsightsResponse } from "@/lib/ai/types";

export function AiInsightsPanel({
  from,
  to,
  branchId,
}: {
  from: string;
  to: string;
  branchId: string | null;
}) {
  const query = useQuery({
    queryKey: ["ai-insights", from, to, branchId],
    queryFn: async (): Promise<InsightsResponse> => {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, branchId }),
      });
      const j = (await res.json()) as InsightsResponse & { error?: string };
      if (!res.ok) {
        throw new Error(j.error ?? "Could not load AI insights");
      }
      return j as InsightsResponse;
    },
  });

  if (query.isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="AI insights loading"
        className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900 dark:bg-indigo-950/30"
      >
        <div className="h-4 w-40 animate-pulse rounded bg-indigo-200/80 dark:bg-indigo-900/60" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-indigo-100 dark:bg-indigo-900/50" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-indigo-100 dark:bg-indigo-900/50" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-indigo-100 dark:bg-indigo-900/50" />
        </div>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        AI insights are unavailable (
        {query.error instanceof Error ? query.error.message : "Error"}).
        Check server
        configuration (GEMINI_API_KEY) and retry.
      </section>
    );
  }

  const data = query.data;
  if (!data) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-labelledby="ai-insights-heading"
      className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900 dark:bg-indigo-950/30"
    >
      <h2
        id="ai-insights-heading"
        className="text-lg font-semibold text-indigo-950 dark:text-indigo-100"
      >
        AI narrative
      </h2>
      <p className="mt-1 text-sm text-indigo-900/90 dark:text-indigo-100/90">
        {data.summary}
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-indigo-950 dark:text-indigo-100">
        {data.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      {(data.risks.length > 0 || data.opportunities.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.risks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">
                Risks
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-red-900 dark:text-red-100">
                {data.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {data.opportunities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                Opportunities
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-emerald-900 dark:text-emerald-100">
                {data.opportunities.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {data.suggestedQueries?.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
            Try asking the assistant
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.suggestedQueries.map((q) => (
              <li key={q}>
                <span className="rounded-full bg-white/80 px-2 py-1 text-xs text-indigo-900 shadow-sm dark:bg-indigo-900/60 dark:text-indigo-50">
                  {q}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </motion.section>
  );
}
