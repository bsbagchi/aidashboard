"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "@/lib/dealership/analytics";

export function TrendChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No months in selected range.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: d.month,
    targetUnits: d.targetUnits,
    deliveredUnits: d.deliveredUnits,
  }));

  return (
    <div className="h-80 w-full rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Units: target vs delivered (by month)
      </h3>
      <p className="mb-3 text-xs text-zinc-500">
        Targets aggregate all branches unless a single branch is selected.
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="targetUnits"
            name="Target units"
            stroke="#a1a1aa"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="deliveredUnits"
            name="Delivered units"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
