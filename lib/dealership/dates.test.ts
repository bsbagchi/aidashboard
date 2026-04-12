import { describe, expect, it } from "vitest";
import {
  defaultDateRange,
  parseRangeFromQuery,
  parseISODateDay,
} from "./dates";

describe("parseRangeFromQuery", () => {
  it("returns full default range when params missing", () => {
    const r = parseRangeFromQuery(undefined, undefined);
    expect(r.from.toISOString().slice(0, 10)).toBe("2025-06-01");
    expect(r.to.toISOString().slice(0, 10)).toBe("2025-12-31");
  });

  it("parses valid from/to", () => {
    const r = parseRangeFromQuery("2025-07-01", "2025-09-30");
    expect(r.from.toISOString().slice(0, 10)).toBe("2025-07-01");
    expect(r.to.toISOString().slice(0, 10)).toBe("2025-09-30");
  });

  it("swaps when from after to", () => {
    const r = parseRangeFromQuery("2025-12-01", "2025-06-01");
    expect(r.from <= r.to).toBe(true);
  });
});

describe("defaultDateRange", () => {
  it("covers Jun–Dec 2025", () => {
    const r = defaultDateRange();
    expect(parseISODateDay("2025-06-01").getTime()).toBe(r.from.getTime());
  });
});
