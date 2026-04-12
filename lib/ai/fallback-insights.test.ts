import { describe, expect, it } from "vitest";
import dealershipData from "@/doc/dealership_data.json";
import { buildAnalyticsSummaryJson } from "./analytics-summary";
import { buildFallbackInsights } from "./fallback-insights";
import { defaultDateRange } from "@/lib/dealership/dates";
import type { DealershipDataset } from "@/lib/dealership/types";

describe("buildFallbackInsights", () => {
  it("produces bullets and suggested queries from dataset summary", () => {
    const data = dealershipData as DealershipDataset;
    const summary = buildAnalyticsSummaryJson(data, defaultDateRange(), null);
    const out = buildFallbackInsights(summary);
    expect(out.summary.length).toBeGreaterThan(10);
    expect(out.bullets.length).toBeGreaterThanOrEqual(4);
    expect(out.suggestedQueries.length).toBe(4);
    expect(Array.isArray(out.risks)).toBe(true);
    expect(Array.isArray(out.opportunities)).toBe(true);
  });
});
