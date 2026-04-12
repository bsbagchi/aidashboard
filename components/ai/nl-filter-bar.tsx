"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function NlFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = async () => {
    setError(null);
    const q = text.trim();
    if (!q) return;
    try {
      const res = await fetch("/api/parse-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const j = (await res.json()) as {
        from?: string | null;
        to?: string | null;
        branchId?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(j.error ?? "Could not parse filters");
      }
      const p = new URLSearchParams(searchParams.toString());
      if (j.from) p.set("from", j.from);
      if (j.to) p.set("to", j.to);
      if (j.branchId) p.set("branch", j.branchId);
      else p.delete("branch");
      startTransition(() => {
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Natural language filters
          </span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Q3 2025 for Downtown Toyota" or "December 2025 only"'
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={() => void apply()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Apply to dashboard
        </button>
      </div>
      {pending && (
        <p className="mt-2 text-xs text-zinc-500" aria-live="polite">
          Applying filters…
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
