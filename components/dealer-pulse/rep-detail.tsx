"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getLeadsTouchingRange,
  getOverviewKpis,
} from "@/lib/dealership/analytics";
import { formatISODate, parseRangeFromQuery } from "@/lib/dealership/dates";
import type { DealershipDataset } from "@/lib/dealership/types";
import { AppShell } from "./app-shell";
import { FilterBar } from "./filter-bar";
import { KpiCards } from "./kpi-cards";
import { LeadsTable } from "./leads-table";

export function RepDetail({
  data,
  repId,
}: {
  data: DealershipDataset;
  repId: string;
}) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "2025-06-01";
  const to = searchParams.get("to") ?? "2025-12-31";

  const range = useMemo(() => parseRangeFromQuery(from, to), [from, to]);
  const rep = data.sales_reps.find((r) => r.id === repId)!;
  const branch = data.branches.find((b) => b.id === rep.branch_id)!;

  const kpis = useMemo(
    () => getOverviewKpis(data, range, { repId }),
    [data, range, repId],
  );
  const leadRows = useMemo(
    () => getLeadsTouchingRange(data.leads, range, { repId }),
    [data.leads, range, repId],
  );

  const qs = searchParams.toString();
  const subtitle = `${formatISODate(range.from)} → ${formatISODate(range.to)} · ${rep.role === "branch_manager" ? "Branch manager" : "Sales officer"}`;

  return (
    <AppShell
      title={rep.name}
      subtitle={subtitle}
      breadcrumbs={[
        { href: `/?${qs}`, label: "Overview" },
        { href: `/branch/${branch.id}?${qs}`, label: branch.name },
        { label: rep.name },
      ]}
    >
      <div className="flex flex-col gap-6">
        <FilterBar branches={data.branches} hideBranchSelect />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Branch:{" "}
          <Link
            href={`/branch/${branch.id}?${qs}`}
            className="font-medium text-teal-800 underline dark:text-teal-400"
          >
            {branch.name}
          </Link>
        </p>
        <KpiCards kpis={kpis} />
        <section>
          <h2 className="mb-3 text-lg font-semibold">Leads in period</h2>
          <LeadsTable leads={leadRows} />
        </section>
      </div>
    </AppShell>
  );
}
