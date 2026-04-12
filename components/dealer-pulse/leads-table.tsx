import type { Lead } from "@/lib/dealership/types";
import { formatINR } from "@/lib/dealership/format";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No leads touch this period for the current filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Leads in scope for the selected period</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800">
          <tr>
            <th scope="col" className="px-4 py-3">
              Lead
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Value
            </th>
            <th scope="col" className="px-4 py-3">
              Activity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {leads.slice(0, 50).map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3">
                <span className="font-medium">{l.customer_name}</span>
                <div className="text-xs text-zinc-500">
                  {l.id} · {l.model_interested}
                </div>
              </td>
              <td className="px-4 py-3 capitalize">
                {l.status.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatINR(l.deal_value)}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                <time dateTime={l.last_activity_at}>
                  {l.last_activity_at.slice(0, 10)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length > 50 && (
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          Showing 50 of {leads.length} leads.
        </p>
      )}
    </div>
  );
}
