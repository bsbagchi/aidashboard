import Link from "next/link";
import type { RepRow } from "@/lib/dealership/analytics";
import { formatCompactINR } from "@/lib/dealership/format";

export function RepTable({
  rows,
  searchParams,
  limit = 12,
}: {
  rows: RepRow[];
  searchParams: string;
  limit?: number;
}) {
  const shown = rows.slice(0, limit);

  if (shown.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No reps in this filter.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Sales rep leaderboard for the period</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800">
          <tr>
            <th scope="col" className="px-4 py-3">
              Rep
            </th>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {shown.map((r) => (
            <tr key={r.rep.id}>
              <th scope="row" className="px-4 py-3 font-medium">
                <Link
                  href={`/rep/${r.rep.id}?${searchParams}`}
                  className="text-teal-800 hover:underline dark:text-teal-400"
                >
                  {r.rep.name}
                </Link>
                {r.rep.role === "branch_manager" && (
                  <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    Mgr
                  </span>
                )}
              </th>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {r.branch.name}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{r.newLeads}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.deliveredUnits}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCompactINR(r.deliveredRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
