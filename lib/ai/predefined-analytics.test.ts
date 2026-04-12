import { describe, expect, it } from "vitest";
import dealershipData from "@/doc/dealership_data.json";
import { parseRangeFromQuery } from "@/lib/dealership/dates";
import type { DealershipDataset } from "@/lib/dealership/types";
import { buildPredefinedAnalyticsBlock } from "./predefined-analytics";

describe("buildPredefinedAnalyticsBlock", () => {
  const data = dealershipData as DealershipDataset;
  const range = parseRangeFromQuery("2025-06-01", "2025-12-31");

  it("returns null for general", () => {
    expect(
      buildPredefinedAnalyticsBlock("general", data, range, null),
    ).toBeNull();
  });

  it("returns top reps block for top_reps", () => {
    const s = buildPredefinedAnalyticsBlock("top_reps", data, range, null);
    expect(s).toContain("PREDEFINED ANALYTICS");
    expect(s).toContain("1.");
  });

  it("returns KPI block for kpis", () => {
    const s = buildPredefinedAnalyticsBlock("kpis", data, range, null);
    expect(s).toContain("PREDEFINED KPIs");
    expect(s).toContain("New leads");
  });
});
