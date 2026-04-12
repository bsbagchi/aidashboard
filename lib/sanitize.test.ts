import { describe, expect, it } from "vitest";
import { sanitizeUserText } from "./sanitize";

describe("sanitizeUserText", () => {
  it("strips script tags", () => {
    expect(sanitizeUserText('hello<script>alert(1)</script>')).toBe("hello");
  });

  it("truncates to max length", () => {
    const s = "a".repeat(20);
    expect(sanitizeUserText(s, 5).length).toBe(5);
  });
});
