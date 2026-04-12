import { describe, expect, it } from "vitest";
import dealershipData from "@/doc/dealership_data.json";
import type { DealershipDataset } from "@/lib/dealership/types";
import { buildRagChunks } from "./chunks";

describe("buildRagChunks", () => {
  it("creates multiple deterministic chunks", () => {
    const data = dealershipData as DealershipDataset;
    const chunks = buildRagChunks(data);
    expect(chunks.length).toBeGreaterThan(20);
    expect(chunks.some((c) => c.id === "meta-overview")).toBe(true);
    expect(chunks.every((c) => c.text.length > 0)).toBe(true);
  });

  it("minimal scope omits lead and delivery batches", () => {
    const data = dealershipData as DealershipDataset;
    const full = buildRagChunks(data, "full");
    const minimal = buildRagChunks(data, "minimal");
    expect(minimal.length).toBeLessThan(full.length);
    expect(minimal.some((c) => c.metadata.type === "leads")).toBe(false);
    expect(minimal.some((c) => c.metadata.type === "deliveries")).toBe(false);
    expect(minimal.some((c) => c.id === "meta-overview")).toBe(true);
  });
});
