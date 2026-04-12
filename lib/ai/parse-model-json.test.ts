import { describe, expect, it } from "vitest";
import { parseJsonFromModelText } from "./parse-model-json";

describe("parseJsonFromModelText", () => {
  it("parses raw JSON object", () => {
    const out = parseJsonFromModelText('{"a":1,"bullets":["x"]}') as {
      a: number;
      bullets: string[];
    };
    expect(out.a).toBe(1);
    expect(out.bullets).toEqual(["x"]);
  });

  it("parses fenced json blocks", () => {
    const raw = 'Here you go:\n```json\n{"bullets":["one"],"summary":"s"}\n```\n';
    const out = parseJsonFromModelText(raw) as { bullets: string[]; summary: string };
    expect(out.summary).toBe("s");
    expect(out.bullets).toEqual(["one"]);
  });

  it("extracts first object when prose wraps JSON", () => {
    const raw = 'Analysis:\n{"bullets":["b"],"summary":"","risks":[],"opportunities":[],"suggestedQueries":[]}\nThanks.';
    const out = parseJsonFromModelText(raw) as { bullets: string[] };
    expect(out.bullets).toEqual(["b"]);
  });
});
