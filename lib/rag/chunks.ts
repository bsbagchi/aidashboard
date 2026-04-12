import type { RagChunkScope } from "@/lib/ai/env";
import type { DealershipDataset } from "@/lib/dealership/types";
import type { RagChunk } from "./types";

const LEADS_PER_CHUNK = 18;
const DELIVERIES_PER_CHUNK = 40;

function branchName(data: DealershipDataset, id: string): string {
  return data.branches.find((b) => b.id === id)?.name ?? id;
}

/**
 * Deterministic text chunks for embedding. Keep each chunk under ~3.5k chars for vector metadata limits.
 * `minimal` scope: metadata + branches + targets only (far fewer Gemini/Ollama embed calls; no lead/delivery rows).
 */
export function buildRagChunks(
  data: DealershipDataset,
  scope: RagChunkScope = "full",
): RagChunk[] {
  const chunks: RagChunk[] = [];

  chunks.push({
    id: "meta-overview",
    text: [
      `DealerPulse dataset: ${data.metadata.description}`,
      `Date range: ${data.metadata.date_range}`,
      `Branches (${data.branches.length}): ${data.branches.map((b) => `${b.name} [${b.id}] (${b.city})`).join("; ")}`,
      `Sales reps: ${data.sales_reps.length} total.`,
    ].join("\n"),
    metadata: { type: "overview" },
  });

  for (const b of data.branches) {
    const reps = data.sales_reps.filter((r) => r.branch_id === b.id);
    chunks.push({
      id: `branch-${b.id}`,
      text: [
        `Branch ${b.name} (${b.id}) — ${b.city}.`,
        `Team: ${reps.map((r) => `${r.name} [${r.id}] (${r.role})`).join("; ")}`,
      ].join("\n"),
      metadata: { type: "branch", branchId: b.id },
    });
  }

  if (scope === "minimal") {
    for (const t of data.targets) {
      const bn = branchName(data, t.branch_id);
      chunks.push({
        id: `target-${t.branch_id}-${t.month}`,
        text: `Targets for ${bn} (${t.branch_id}) month ${t.month}: units=${t.target_units}, revenue=${t.target_revenue}`,
        metadata: { type: "target", branchId: t.branch_id, month: t.month },
      });
    }
    return chunks;
  }

  for (let i = 0; i < data.leads.length; i += LEADS_PER_CHUNK) {
    const slice = data.leads.slice(i, i + LEADS_PER_CHUNK);
    const lines = slice.map((l) => {
      const b = branchName(data, l.branch_id);
      return [
        `Lead ${l.id}: ${l.customer_name}`,
        `branch=${l.branch_id} (${b}), rep=${l.assigned_to}`,
        `status=${l.status}, source=${l.source}, model=${l.model_interested}`,
        `value=${l.deal_value}, created=${l.created_at}, last_activity=${l.last_activity_at}`,
        `expected_close=${l.expected_close_date}, lost_reason=${l.lost_reason ?? "n/a"}`,
      ].join(" | ");
    });
    chunks.push({
      id: `leads-${i}`,
      text: `Lead records (batch):\n${lines.join("\n")}`,
      metadata: { type: "leads" },
    });
  }

  for (const t of data.targets) {
    const bn = branchName(data, t.branch_id);
    chunks.push({
      id: `target-${t.branch_id}-${t.month}`,
      text: `Targets for ${bn} (${t.branch_id}) month ${t.month}: units=${t.target_units}, revenue=${t.target_revenue}`,
      metadata: { type: "target", branchId: t.branch_id, month: t.month },
    });
  }

  for (let i = 0; i < data.deliveries.length; i += DELIVERIES_PER_CHUNK) {
    const slice = data.deliveries.slice(i, i + DELIVERIES_PER_CHUNK);
    const lines = slice.map((d) => {
      const lead = data.leads.find((l) => l.id === d.lead_id);
      return `Delivery lead=${d.lead_id} branch=${lead?.branch_id ?? "?"} order=${d.order_date} delivered=${d.delivery_date} days=${d.days_to_deliver} delay=${d.delay_reason ?? "none"}`;
    });
    chunks.push({
      id: `deliveries-${i}`,
      text: `Delivery records:\n${lines.join("\n")}`,
      metadata: { type: "deliveries" },
    });
  }

  return chunks;
}
