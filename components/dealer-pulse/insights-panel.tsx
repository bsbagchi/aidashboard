import Link from "next/link";
import type { StaleLead, TargetGapInsight } from "@/lib/dealership/analytics";
import { formatPercent } from "@/lib/dealership/format";

export function InsightsPanel({
  staleLeads,
  targetGap,
  branchFilter,
  queryString,
}: {
  staleLeads: StaleLead[];
  targetGap: TargetGapInsight | null;
  branchFilter: string | null;
  queryString: string;
}) {
  return (
    <section
      aria-labelledby="insights-heading"
      className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30"
    >
      <h2 id="insights-heading" className="text-lg font-semibold text-amber-950 dark:text-amber-100">
        Actionable insights
      </h2>
      <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
        Prioritized for branch managers — follow up before pipeline goes cold.
      </p>
      <ul className="mt-4 space-y-3">
        {targetGap && !branchFilter && (
          <li className="rounded-lg bg-white/80 p-3 text-sm dark:bg-zinc-900/80">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Target risk — {targetGap.branch.name}
            </span>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">
              Only {formatPercent(targetGap.pctOfTarget)} of the{" "}
              <time dateTime={targetGap.month}>{targetGap.month}</time> unit
              target met so far ({targetGap.deliveredUnits} /{" "}
              {targetGap.targetUnits} units), with about{" "}
              {targetGap.daysRemainingInMonth} days left in the month. Consider
              reallocating effort to high-intent leads or marketing support.
            </p>
            <Link
              href={`/branch/${targetGap.branch.id}${queryString ? `?${queryString}` : ""}`}
              className="mt-2 inline-block text-sm font-medium text-teal-800 underline dark:text-teal-400"
            >
              Open branch view
            </Link>
          </li>
        )}
        {staleLeads.length > 0 ? (
          <li className="rounded-lg bg-white/80 p-3 text-sm dark:bg-zinc-900/80">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Stale open leads ({staleLeads.length})
            </span>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">
              {staleLeads.length} open leads have had no activity for 7+ days
              (measured at the end of your selected range). Top cases are listed
              below.
            </p>
          </li>
        ) : (
          <li className="rounded-lg bg-white/80 p-3 text-sm dark:bg-zinc-900/80">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Follow-up health
            </span>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">
              No open leads in this filter are stale by the 7-day rule — strong
              discipline on recent activity.
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}
