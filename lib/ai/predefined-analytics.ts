import { formatCompactINR } from "@/lib/dealership/format";
import {
  getBranchTable,
  getFunnelForLeadsCreatedInRange,
  getOverviewKpis,
  getRepTable,
  getStaleOpenLeads,
} from "@/lib/dealership/analytics";
import type { DateRange, DealershipDataset } from "@/lib/dealership/types";
import type { ChatIntent } from "./intent";

/**
 * Exact computed metrics for common intents — merged ahead of vector RAG chunks.
 */
export function buildPredefinedAnalyticsBlock(
  intent: ChatIntent,
  data: DealershipDataset,
  range: DateRange,
  branchId: string | null,
): string | null {
  if (intent === "general") return null;

  const scope = branchId ? { branchId } : undefined;

  switch (intent) {
    case "top_reps": {
      const rows = getRepTable(data, range, branchId);
      const sorted = [...rows].sort(
        (a, b) => b.deliveredRevenue - a.deliveredRevenue,
      );
      const top = sorted.slice(0, 5);
      const lines = top.map(
        (r, i) =>
          `${i + 1}. ${r.rep.name} [${r.rep.id}] — ${formatCompactINR(r.deliveredRevenue)} delivered revenue, ${r.deliveredUnits} units, pipeline ${formatCompactINR(r.pipelineValue)} (${r.branch.name} [${r.branch.id}])`,
      );
      return `PREDEFINED ANALYTICS (exact — top reps by delivered revenue in selected range):\n${lines.join("\n")}`;
    }
    case "kpis": {
      const k = getOverviewKpis(data, range, scope);
      return [
        "PREDEFINED KPIs (exact numbers for the selected date range and branch filter):",
        `- New leads created: ${k.newLeads}`,
        `- Delivered units: ${k.deliveredUnits}`,
        `- Delivered revenue: ${formatCompactINR(k.deliveredRevenue)}`,
        `- Open pipeline: ${k.pipelineOpenCount} leads, ${formatCompactINR(k.pipelineOpenValue)} value`,
        `- Lost leads (in range): ${k.lostLeads}`,
      ].join("\n");
    }
    case "stale_leads": {
      const stale = getStaleOpenLeads(data, range, branchId, 7);
      const head = stale.slice(0, 8);
      const lines = head.map(
        (s) =>
          `- Lead ${s.lead.id} ${s.lead.customer_name} (${s.branch.name}), ${s.daysSinceActivity}d since activity, ${formatCompactINR(s.lead.deal_value)}`,
      );
      return [
        `PREDEFINED: ${stale.length} stale open leads (7+ days without activity) in range.`,
        lines.length ? lines.join("\n") : "(none in this slice)",
      ].join("\n");
    }
    case "funnel": {
      const f = getFunnelForLeadsCreatedInRange(data.leads, range);
      const lines = f.map((x) => `- ${x.stage}: ${x.reached} leads reached`);
      return `PREDEFINED FUNNEL (leads created in selected range, by max stage reached):\n${lines.join("\n")}`;
    }
    case "branches": {
      const rows = getBranchTable(data, range, branchId);
      const lines = rows.map(
        (r) =>
          `- ${r.branch.name} [${r.branch.id}]: ${formatCompactINR(r.deliveredRevenue)} delivered revenue, ${r.deliveredUnits} units, pipeline ${formatCompactINR(r.pipelineValue)}`,
      );
      return `PREDEFINED BRANCH ROLLUP (exact):\n${lines.join("\n")}`;
    }
    default:
      return null;
  }
}
