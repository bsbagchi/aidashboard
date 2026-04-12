import { describe, expect, it } from "vitest";
import { buildRagSystemInstruction } from "./prompts";

describe("buildRagSystemInstruction", () => {
  it("when context is empty, does not claim snippets exist", () => {
    const s = buildRagSystemInstruction("full dataset", []);
    expect(s).toContain("RETRIEVED CONTEXT: (none)");
    expect(s).toContain("were not loaded");
  });

  it("when context is present, instructs to ground in snippets and avoid refusal phrases", () => {
    const s = buildRagSystemInstruction(
      "date range 2025-12-01 to 2025-12-31; branch scope: all branches",
      ["Lead L001: branch=B1 (Downtown Toyota), value=500000"],
    );
    expect(s).toContain("GROUNDING RULES");
    expect(s).toContain("L001");
    expect(s).toContain("Do NOT write that the dataset is");
    expect(s).toContain("DASHBOARD FILTER");
  });
});
