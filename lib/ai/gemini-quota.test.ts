import { describe, expect, it, vi } from "vitest";
import {
  isGeminiRateLimitError,
  isLikelyQuotaExhaustedForProject,
  parseRetryAfterMs,
  userFacingGeminiError,
  withGeminiRetry,
} from "./gemini-quota";

describe("isGeminiRateLimitError", () => {
  it("detects status 429", () => {
    expect(isGeminiRateLimitError({ status: 429 })).toBe(true);
  });

  it("detects message patterns", () => {
    expect(
      isGeminiRateLimitError(new Error("429 Too Many Requests")),
    ).toBe(true);
    expect(isGeminiRateLimitError(new Error("quota exceeded"))).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isGeminiRateLimitError(new Error("network"))).toBe(false);
    expect(isGeminiRateLimitError({ status: 500 })).toBe(false);
  });
});

describe("isLikelyQuotaExhaustedForProject", () => {
  it("detects limit: 0 in payload", () => {
    expect(
      isLikelyQuotaExhaustedForProject(
        new Error('limit: 0, model: gemini-2.0-flash-lite'),
      ),
    ).toBe(true);
  });
});

describe("parseRetryAfterMs", () => {
  it("parses retry in Ns", () => {
    expect(
      parseRetryAfterMs(new Error("Please retry in 31.710063444s.")),
    ).toBe(31711);
  });
});

describe("withGeminiRetry", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withGeminiRetry(fn, { maxAttempts: 3 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 then succeeds", async () => {
    const err = Object.assign(new Error("429"), { status: 429 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("done");
    await expect(withGeminiRetry(fn, { maxAttempts: 3 })).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry when free-tier quota is exhausted (limit: 0)", async () => {
    const err = Object.assign(
      new Error(
        "[429] Quota exceeded for metric: generate_content_free_tier_requests, limit: 0",
      ),
      { status: 429 },
    );
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withGeminiRetry(fn, { maxAttempts: 4 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("userFacingGeminiError", () => {
  it("returns billing hint when quota exhausted", () => {
    const msg = userFacingGeminiError(
      new Error("limit: 0, quota exceeded for free tier"),
    );
    expect(msg).toContain("Google AI Studio");
  });
});

