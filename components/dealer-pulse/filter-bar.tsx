"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { DATE_PRESETS } from "@/lib/dealership/presets";
import type { Branch } from "@/lib/dealership/types";

export function FilterBar({
  branches,
  hideBranchSelect,
}: {
  branches: Branch[];
  /** Hide branch dropdown on branch/rep drill-down pages to avoid conflicting URL state. */
  hideBranchSelect?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "2025-06-01";
  const to = searchParams.get("to") ?? "2025-12-31";
  const branch = searchParams.get("branch") ?? "";

  const pushParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Time range
          </span>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  pushParams({ from: preset.from, to: preset.to })
                }
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  from === preset.from && to === preset.to
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => pushParams({ from: e.target.value })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-zinc-500">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => pushParams({ to: e.target.value })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          {!hideBranchSelect && (
            <label className="flex min-w-[200px] flex-col gap-1 text-sm">
              <span className="text-xs text-zinc-500">Branch</span>
              <select
                value={branch}
                onChange={(e) =>
                  pushParams({ branch: e.target.value || undefined })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      {pending && (
        <p className="mt-3 text-xs text-zinc-500" aria-live="polite">
          Updating…
        </p>
      )}
    </div>
  );
}
