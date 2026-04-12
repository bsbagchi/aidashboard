"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatAssistant } from "@/components/ai/chat-assistant";
import { NlFilterBar } from "@/components/ai/nl-filter-bar";
import type { ChatContextFilter } from "@/lib/ai/types";
import {
  getBranchTable,
  getFunnelForLeadsCreatedInRange,
  getLeadsTouchingRange,
  getMonthlyTrend,
  getOverviewKpis,
  getRepTable,
  getStaleOpenLeads,
  sourceBreakdown,
} from "@/lib/dealership/analytics";
import { formatISODate, parseRangeFromQuery } from "@/lib/dealership/dates";
import { downloadCsv, leadsToCsv } from "@/lib/dealership/export-csv";
import type { DateRange, DealershipDataset, Lead } from "@/lib/dealership/types";
import { AppShell } from "./app-shell";
import { BranchTable } from "./branch-table";
import { FilterBar } from "./filter-bar";
import { FunnelChart } from "./funnel-chart";
import { KpiCards } from "./kpi-cards";
import { RepTable } from "./rep-table";
import { SourceChart } from "./source-chart";
import { StaleLeadsTable } from "./stale-leads-table";
import { TrendChart } from "./trend-chart";

function resolveBranchFilter(
  data: DealershipDataset,
  branchParam: string | null,
): string | null {
  if (!branchParam) return null;
  return data.branches.some((b) => b.id === branchParam) ? branchParam : null;
}

function leadsForExport(data: DealershipDataset, range: DateRange): Lead[] {
  return getLeadsTouchingRange(data.leads, range, {});
}

export function DealershipDashboard({ data }: { data: DealershipDataset }) {
  const [chatOpen, setChatOpen] = useState(false);
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "2025-06-01";
  const to = searchParams.get("to") ?? "2025-12-31";
  const branchParam = searchParams.get("branch");

  const range = useMemo(
    () => parseRangeFromQuery(from, to),
    [from, to],
  );
  const branchFilter = useMemo(
    () => resolveBranchFilter(data, branchParam),
    [data, branchParam],
  );

  const kpis = useMemo(
    () =>
      getOverviewKpis(
        data,
        range,
        branchFilter ? { branchId: branchFilter } : undefined,
      ),
    [data, range, branchFilter],
  );
  const branchRows = useMemo(
    () => getBranchTable(data, range, branchFilter),
    [data, range, branchFilter],
  );
  const repRows = useMemo(
    () => getRepTable(data, range, branchFilter),
    [data, range, branchFilter],
  );
  const funnel = useMemo(
    () => getFunnelForLeadsCreatedInRange(data.leads, range),
    [data.leads, range],
  );
  const trend = useMemo(
    () => getMonthlyTrend(data, range, branchFilter),
    [data, range, branchFilter],
  );
  const stale = useMemo(
    () => getStaleOpenLeads(data, range, branchFilter, 7),
    [data, range, branchFilter],
  );
  const sources = useMemo(
    () => sourceBreakdown(data.leads, range),
    [data.leads, range],
  );

  const qs = searchParams.toString();
  const chatContext: ChatContextFilter = {
    from,
    to,
    branchId: branchFilter,
  };
  const subtitle = `${formatISODate(range.from)} → ${formatISODate(range.to)}${
    branchFilter
      ? ` · ${data.branches.find((b) => b.id === branchFilter)?.name ?? ""}`
      : ""
  }`;

  const exportCsv = () => {
    const leads = leadsForExport(data, range);
    const csv = leadsToCsv(leads);
    downloadCsv(`dealerpulse-leads-${from}-${to}.csv`, csv);
  };

  return (
    <AppShell
      title="Network overview"
      subtitle={subtitle}
      breadcrumbs={undefined}
    >
      <div className="flex flex-col gap-6">
        <FilterBar branches={data.branches} />
        <NlFilterBar />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Synthetic dataset ({data.metadata.date_range}). Metrics use
            delivery dates for revenue and creation dates for funnel intake.
          </p>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Export leads (CSV)
          </button>
        </div>
        <KpiCards kpis={kpis} />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TrendChart data={trend} />
          <FunnelChart data={funnel} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SourceChart data={sources} />
          <div className="flex flex-col justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              How to drill down
            </h3>
            <p className="mt-2">
              Use the branch table to open a branch view, or jump to a rep from
              the leaderboard. Filters apply across the app via the URL so views
              are shareable.
            </p>
          </div>
        </div>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Branches</h2>
          <BranchTable rows={branchRows} searchParams={qs} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Rep leaderboard</h2>
          <RepTable rows={repRows} searchParams={qs} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Stale open leads</h2>
          <StaleLeadsTable rows={stale} searchParams={qs} />
        </section>
        <ChatAssistant
          open={chatOpen}
          onOpenChange={setChatOpen}
          context={chatContext}
          branches={data.branches}
        />
      </div>
    </AppShell>
  );
}
