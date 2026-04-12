import { describe, expect, it } from "vitest";
import type { DealershipDataset, Lead } from "./types";
import {
  buildLeadMap,
  deliveryInRange,
  getFunnelForLeadsCreatedInRange,
  getLeadsTouchingRange,
  getOverviewKpis,
  leadCreatedInRange,
  reachedStage,
} from "./analytics";
import { defaultDateRange, parseRangeFromQuery } from "./dates";

const baseLead = (over: Partial<Lead> & Pick<Lead, "id">): Lead => ({
  customer_name: "Test",
  phone: "9000000000",
  source: "website",
  model_interested: "X",
  status: "new",
  assigned_to: "SR1",
  branch_id: "B1",
  created_at: "2025-06-15T10:00:00Z",
  last_activity_at: "2025-06-15T10:00:00Z",
  status_history: [
    { status: "new", timestamp: "2025-06-15T10:00:00Z", note: "in" },
  ],
  expected_close_date: "2025-07-01",
  deal_value: 1_000_000,
  lost_reason: null,
  ...over,
});

const minimalDataset = (): DealershipDataset => ({
  metadata: {
    generated_at: "",
    description: "",
    date_range: "",
    notes: "",
  },
  branches: [{ id: "B1", name: "Branch One", city: "X" }],
  sales_reps: [
    {
      id: "SR1",
      name: "Rep",
      branch_id: "B1",
      role: "sales_officer",
      joined: "2020-01-01",
    },
  ],
  leads: [
    baseLead({
      id: "L1",
      status: "delivered",
      status_history: [
        { status: "new", timestamp: "2025-06-10T10:00:00Z", note: "" },
        { status: "delivered", timestamp: "2025-07-01T10:00:00Z", note: "" },
      ],
      deal_value: 2_000_000,
    }),
    baseLead({
      id: "L2",
      status: "lost",
      created_at: "2025-08-01T10:00:00Z",
      last_activity_at: "2025-08-05T10:00:00Z",
      status_history: [
        { status: "new", timestamp: "2025-08-01T10:00:00Z", note: "" },
        { status: "lost", timestamp: "2025-08-05T10:00:00Z", note: "" },
      ],
    }),
    baseLead({
      id: "L3",
      status: "new",
      created_at: "2025-06-20T10:00:00Z",
      last_activity_at: "2025-06-20T10:00:00Z",
    }),
  ],
  targets: [],
  deliveries: [
    {
      lead_id: "L1",
      order_date: "2025-06-25",
      delivery_date: "2025-07-10",
      days_to_deliver: 15,
      delay_reason: null,
    },
  ],
});

describe("buildLeadMap", () => {
  it("indexes by id", () => {
    const data = minimalDataset();
    const m = buildLeadMap(data.leads);
    expect(m.get("L1")?.deal_value).toBe(2_000_000);
  });
});

describe("getOverviewKpis", () => {
  it("counts deliveries in range and revenue", () => {
    const range = parseRangeFromQuery("2025-07-01", "2025-07-31");
    const k = getOverviewKpis(minimalDataset(), range);
    expect(k.deliveredUnits).toBe(1);
    expect(k.deliveredRevenue).toBe(2_000_000);
    expect(k.newLeads).toBe(0);
  });

  it("counts new leads created in range", () => {
    const range = defaultDateRange();
    const k = getOverviewKpis(minimalDataset(), range);
    expect(k.newLeads).toBeGreaterThanOrEqual(2);
  });

  it("scopes to branch when requested", () => {
    const range = defaultDateRange();
    const k = getOverviewKpis(minimalDataset(), range, {
      branchId: "B2",
    });
    expect(k.newLeads).toBe(0);
  });
});

describe("getLeadsTouchingRange", () => {
  it("returns leads that overlap the window", () => {
    const range = parseRangeFromQuery("2025-06-01", "2025-06-30");
    const list = getLeadsTouchingRange(minimalDataset().leads, range, {});
    expect(list.some((l) => l.id === "L1")).toBe(true);
  });
});

describe("getFunnelForLeadsCreatedInRange", () => {
  it("counts stage reach for leads created in window", () => {
    const range = parseRangeFromQuery("2025-06-01", "2025-06-30");
    const funnel = getFunnelForLeadsCreatedInRange(minimalDataset().leads, range);
    const delivered = funnel.find((f) => f.stage === "delivered");
    expect(delivered?.reached).toBe(1);
  });
});

describe("reachedStage", () => {
  it("detects history", () => {
    const lead = minimalDataset().leads[0];
    expect(reachedStage(lead, "new")).toBe(true);
    expect(reachedStage(lead, "delivered")).toBe(true);
  });
});

describe("deliveryInRange", () => {
  it("uses delivery_date", () => {
    const range = parseRangeFromQuery("2025-07-01", "2025-07-31");
    expect(
      deliveryInRange(
        {
          lead_id: "L1",
          order_date: "2025-06-01",
          delivery_date: "2025-07-15",
          days_to_deliver: 1,
          delay_reason: null,
        },
        range,
      ),
    ).toBe(true);
  });
});

describe("leadCreatedInRange", () => {
  it("respects boundaries", () => {
    const range = parseRangeFromQuery("2025-08-01", "2025-08-31");
    const lead = baseLead({ id: "x", created_at: "2025-08-01T12:00:00Z" });
    expect(leadCreatedInRange(lead, range)).toBe(true);
  });
});
