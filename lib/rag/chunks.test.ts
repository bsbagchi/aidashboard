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
});
