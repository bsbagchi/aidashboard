"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  getFunnelForLeadsCreatedInRange,
  getLeadsTouchingRange,
  getMonthlyTrend,
  getOverviewKpis,
  getRepTable,
  getStaleOpenLeads,
  sourceBreakdown,
} from "@/lib/dealership/analytics";
import { formatISODate, parseRangeFromQuery } from "@/lib/dealership/dates";
import type { DealershipDataset } from "@/lib/dealership/types";
import { AppShell } from "./app-shell";
import { FilterBar } from "./filter-bar";
import { FunnelChart } from "./funnel-chart";
import { KpiCards } from "./kpi-cards";
import { LeadsTable } from "./leads-table";
import { RepTable } from "./rep-table";
import { SourceChart } from "./source-chart";
import { StaleLeadsTable } from "./stale-leads-table";
import { TrendChart } from "./trend-chart";

export function BranchDetail({
  data,
  branchId,
}: {
  data: DealershipDataset;
  branchId: string;
}) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "2025-06-01";
  const to = searchParams.get("to") ?? "2025-12-31";

  const range = useMemo(() => parseRangeFromQuery(from, to), [from, to]);
  const branch = data.branches.find((b) => b.id === branchId)!;
  const branchLeads = useMemo(
    () => data.leads.filter((l) => l.branch_id === branchId),
    [data.leads, branchId],
  );

  const kpis = useMemo(
    () => getOverviewKpis(data, range, { branchId }),
    [data, range, branchId],
  );
  const repRows = useMemo(
    () => getRepTable(data, range, branchId),
    [data, range, branchId],
  );
  const funnel = useMemo(
    () => getFunnelForLeadsCreatedInRange(branchLeads, range),
    [branchLeads, range],
  );
  const trend = useMemo(
    () => getMonthlyTrend(data, range, branchId),
    [data, range, branchId],
  );
  const stale = useMemo(
    () => getStaleOpenLeads(data, range, branchId, 7),
    [data, range, branchId],
  );
  const sources = useMemo(
    () => sourceBreakdown(branchLeads, range),
    [branchLeads, range],
  );
  const leadRows = useMemo(
    () => getLeadsTouchingRange(data.leads, range, { branchId }),
    [data.leads, range, branchId],
  );

  const qs = searchParams.toString();
  const subtitle = `${formatISODate(range.from)} → ${formatISODate(range.to)} · ${branch.city}`;

  return (
    <AppShell
      title={branch.name}
      subtitle={subtitle}
      breadcrumbs={[
        { href: `/?${qs}`, label: "Overview" },
        { label: branch.name },
      ]}
    >
      <div className="flex flex-col gap-6">
        <FilterBar branches={data.branches} hideBranchSelect />
        <KpiCards kpis={kpis} />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TrendChart data={trend} />
          <FunnelChart data={funnel} />
        </div>
        <SourceChart data={sources} />
        <section>
          <h2 className="mb-3 text-lg font-semibold">Team</h2>
          <RepTable rows={repRows} searchParams={qs} limit={30} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Stale open leads</h2>
          <StaleLeadsTable rows={stale} searchParams={qs} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Leads in period</h2>
          <LeadsTable leads={leadRows} />
        </section>
      </div>
    </AppShell>
  );
}
