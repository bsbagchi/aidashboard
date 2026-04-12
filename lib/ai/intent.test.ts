import { describe, expect, it } from "vitest";
import { classifyIntentHeuristic } from "./intent";

describe("classifyIntentHeuristic", () => {
  it("detects top_reps", () => {
    expect(
      classifyIntentHeuristic("List the top three reps by delivered revenue"),
    ).toBe("top_reps");
    expect(classifyIntentHeuristic("Who is on the sales leaderboard?")).toBe(
      "top_reps",
    );
  });

  it("detects kpis", () => {
    expect(classifyIntentHeuristic("Give me a KPI overview")).toBe("kpis");
  });

  it("detects stale_leads", () => {
    expect(classifyIntentHeuristic("Show stale leads with no activity")).toBe(
      "stale_leads",
    );
  });

  it("detects funnel", () => {
    expect(classifyIntentHeuristic("Explain the funnel by stage")).toBe(
      "funnel",
    );
  });

  it("detects branches", () => {
    expect(classifyIntentHeuristic("Compare branch performance")).toBe(
      "branches",
    );
  });

  it("returns general for unmatched", () => {
    expect(classifyIntentHeuristic("What is a VIN?")).toBe("general");
  });
});
