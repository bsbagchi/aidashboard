import { formatCompactINR, formatINR } from "@/lib/dealership/format";
import type { OverviewKpis } from "@/lib/dealership/analytics";

export function KpiCards({ kpis }: { kpis: OverviewKpis }) {
  const items: {
    label: string;
    value: string;
    hint: string;
    tone: "default" | "amber" | "teal";
  }[] = [
    {
      label: "New leads",
      value: String(kpis.newLeads),
      hint: "Created in this period",
      tone: "default",
    },
    {
      label: "Delivered units",
      value: String(kpis.deliveredUnits),
      hint: "Vehicles handed over",
      tone: "teal",
    },
    {
      label: "Delivered revenue",
      value: formatCompactINR(kpis.deliveredRevenue),
      hint: fullValue(kpis.deliveredRevenue),
      tone: "teal",
    },
    {
      label: "Open pipeline",
      value: String(kpis.pipelineOpenCount),
      hint: `${formatINR(kpis.pipelineOpenValue)} weighted value`,
      tone: "amber",
    },
    {
      label: "Lost in period",
      value: String(kpis.lostLeads),
      hint: "Marked lost during range",
      tone: "default",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border p-4 shadow-sm ${
            item.tone === "teal"
              ? "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40"
              : item.tone === "amber"
                ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}

function fullValue(n: number): string {
  return formatINR(n);
}
