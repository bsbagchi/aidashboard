"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FunnelStageCount } from "@/lib/dealership/analytics";

const LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  test_drive: "Test drive",
  negotiation: "Negotiation",
  order_placed: "Order",
  delivered: "Delivered",
};

export function FunnelChart({ data }: { data: FunnelStageCount[] }) {
  const chartData = data.map((d) => ({
    name: LABELS[d.stage] ?? d.stage,
    reached: d.reached,
  }));

  if (chartData.every((d) => d.reached === 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No leads created in this range — widen the date filter to see funnel
        drop-off.
      </div>
    );
  }

  return (
    <div className="h-72 w-full rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Conversion funnel (leads created in range)
      </h3>
      <p className="mb-3 text-xs text-zinc-500">
        Counts show how many leads reached each stage at least once — highlights
        where volume falls away.
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            className="fill-zinc-600"
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e4e4e7",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="reached" fill="#0f766e" name="Leads" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
