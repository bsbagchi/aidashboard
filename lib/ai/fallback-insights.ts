import { formatCompactINR, formatPercent } from "@/lib/dealership/format";
import type { InsightsResponse } from "@/lib/ai/types";

export type AnalyticsSummaryJson = ReturnType<
  typeof import("./analytics-summary").buildAnalyticsSummaryJson
>;

export function buildFallbackInsights(
  summary: AnalyticsSummaryJson,
): InsightsResponse {
  const { kpis, targetGap, staleOpenLeads, range, topSources, branchId } =
    summary;

  const scope = branchId
    ? `branch ${branchId}`
    : "the full network";

  const bullets: string[] = [
    `${kpis.newLeads} new leads created in ${range.from}–${range.to} (${scope}).`,
    `${kpis.deliveredUnits} delivered units and ${formatCompactINR(kpis.deliveredRevenue)} in delivered revenue.`,
    `Open pipeline: ${kpis.pipelineOpenCount} leads worth ${formatCompactINR(kpis.pipelineOpenValue)}.`,
    `${staleOpenLeads} open leads are stale (7+ days without activity) at the end of the range.`,
  ];

  if (topSources.length > 0) {
    const top = topSources.slice(0, 3).map((s) => `${s.source} (${s.count})`);
    bullets.push(`Top intake sources: ${top.join(", ")}.`);
  }

  const risks: string[] = [];
  if (targetGap) {
    risks.push(
      `${targetGap.branch} is at ${formatPercent(targetGap.pctOfTarget)} of the ${targetGap.month} unit target (${targetGap.gapUnits} units short) with about ${targetGap.daysRemainingInMonth} days left in the month.`,
    );
  }
  if (staleOpenLeads >= 5) {
    risks.push(
      `${staleOpenLeads} stale open leads may need manager follow-up to protect conversion.`,
    );
  }

  const opportunities: string[] = [];
  if (kpis.pipelineOpenValue > 0 && kpis.pipelineOpenCount > 0) {
    opportunities.push(
      `Prioritize next actions on the ${kpis.pipelineOpenCount}-lead open pipeline (${formatCompactINR(kpis.pipelineOpenValue)}) to protect revenue.`,
    );
  }

  const suggestedQueries = [
    "Which branch has the weakest funnel conversion in this period?",
    "List the top 5 stale leads by deal value.",
    "How does delivered revenue compare to monthly targets?",
    "Which reps are carrying the most open pipeline value?",
  ];

  return {
    summary: `Performance snapshot for ${range.from} through ${range.to}: ${kpis.deliveredUnits} deliveries, ${kpis.newLeads} new leads, and ${staleOpenLeads} stale open opportunities.`,
    bullets,
    risks,
    opportunities,
    suggestedQueries,
  };
}
