import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getPublicAiConfigSnapshot } from "./config-status";

describe("getPublicAiConfigSnapshot", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports no gemini when key missing", () => {
    const s = getPublicAiConfigSnapshot();
    expect(s.geminiConfigured).toBe(false);
    expect(s.models.chat).toBe("gemini-2.0-flash-lite");
  });

  it("reports gemini when key present", () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const s = getPublicAiConfigSnapshot();
    expect(s.geminiConfigured).toBe(true);
  });

  it("never exposes raw keys", () => {
    vi.stubEnv("GEMINI_API_KEY", "secret");
    const s = getPublicAiConfigSnapshot();
    expect(JSON.stringify(s)).not.toContain("secret");
  });
});
