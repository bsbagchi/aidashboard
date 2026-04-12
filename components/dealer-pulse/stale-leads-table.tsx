import Link from "next/link";
import type { StaleLead } from "@/lib/dealership/analytics";
import { formatINR } from "@/lib/dealership/format";

export function StaleLeadsTable({
  rows,
  searchParams,
}: {
  rows: StaleLead[];
  searchParams: string;
}) {
  const top = rows.slice(0, 15);

  if (top.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">
          Open leads with no activity for seven days or more
        </caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800">
          <tr>
            <th scope="col" className="px-4 py-3">
              Customer
            </th>
            <th scope="col" className="px-4 py-3">
              Branch / rep
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Deal value
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Days idle
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {top.map(({ lead, branch, rep, daysSinceActivity }) => (
            <tr key={lead.id}>
              <td className="px-4 py-3">
                <span className="font-medium">{lead.customer_name}</span>
                <div className="text-xs text-zinc-500">{lead.model_interested}</div>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/branch/${branch.id}?${searchParams}`}
                  className="text-teal-800 hover:underline dark:text-teal-400"
                >
                  {branch.name}
                </Link>
                <div className="text-xs text-zinc-500">
                  <Link
                    href={`/rep/${rep.id}?${searchParams}`}
                    className="hover:underline"
                  >
                    {rep.name}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 capitalize">
                {lead.status.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatINR(lead.deal_value)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-amber-800 dark:text-amber-400">
                {daysSinceActivity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
