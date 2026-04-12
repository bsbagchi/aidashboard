import Link from "next/link";
import type { BranchRow } from "@/lib/dealership/analytics";
import { formatCompactINR, formatPercent } from "@/lib/dealership/format";

export function BranchTable({
  rows,
  searchParams,
}: {
  rows: BranchRow[];
  searchParams: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No branches match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">
          Branch comparison: new leads, deliveries, pipeline, and target
          attainment
        </caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Branch
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              New leads
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Delivered
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Revenue
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Pipeline value
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Unit attainment
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <tr key={r.branch.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <th scope="row" className="px-4 py-3 font-medium">
                <Link
                  href={`/branch/${r.branch.id}?${searchParams}`}
                  className="text-teal-800 hover:underline dark:text-teal-400"
                >
                  {r.branch.name}
                </Link>
                <div className="text-xs font-normal text-zinc-500">
                  {r.branch.city}
                </div>
              </th>
              <td className="px-4 py-3 text-right tabular-nums">{r.newLeads}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.deliveredUnits}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCompactINR(r.deliveredRevenue)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-amber-800 dark:text-amber-300">
                {formatCompactINR(r.pipelineValue)}
              </td>
              <td className="px-4 py-3 text-right">
                {r.attainmentUnits != null && r.targetMonthLabel ? (
                  <span
                    title={`${r.targetMonthLabel} target ${r.targetUnitsMonth} units`}
                  >
                    {formatPercent(r.attainmentUnits)}
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
