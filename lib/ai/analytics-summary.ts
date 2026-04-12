import {
  getLargestTargetGap,
  getOverviewKpis,
  getStaleOpenLeads,
  sourceBreakdown,
} from "@/lib/dealership/analytics";
import type { DateRange, DealershipDataset } from "@/lib/dealership/types";

export function buildAnalyticsSummaryJson(
  data: DealershipDataset,
  range: DateRange,
  branchId: string | null,
) {
  const kpis = getOverviewKpis(
    data,
    range,
    branchId ? { branchId } : undefined,
  );
  const targetGap = getLargestTargetGap(data, range);
  const stale = getStaleOpenLeads(data, range, branchId, 7);
  const sources = sourceBreakdown(data.leads, range);

  return {
    range: {
      from: range.from.toISOString().slice(0, 10),
      to: range.to.toISOString().slice(0, 10),
    },
    branchId,
    kpis,
    targetGap: targetGap
      ? {
          branch: targetGap.branch.name,
          branchId: targetGap.branch.id,
          month: targetGap.month,
          pctOfTarget: targetGap.pctOfTarget,
          gapUnits: targetGap.gapUnits,
          daysRemainingInMonth: targetGap.daysRemainingInMonth,
        }
      : null,
    staleOpenLeads: stale.length,
    topSources: sources.slice(0, 6),
  };
}
