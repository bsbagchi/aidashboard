import type { Lead } from "./types";

function escapeCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "id",
    "customer_name",
    "phone",
    "branch_id",
    "assigned_to",
    "status",
    "source",
    "model",
    "deal_value",
    "created_at",
    "last_activity_at",
    "expected_close_date",
  ];
  const rows = leads.map((l) =>
    [
      l.id,
      l.customer_name,
      l.phone,
      l.branch_id,
      l.assigned_to,
      l.status,
      l.source,
      l.model_interested,
      String(l.deal_value),
      l.created_at,
      l.last_activity_at,
      l.expected_close_date,
    ].map((c) => escapeCell(String(c))),
  );
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
