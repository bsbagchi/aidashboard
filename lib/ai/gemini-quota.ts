/**
 * Helpers for Gemini API rate limits / quota (429). See https://ai.google.dev/gemini-api/docs/rate-limits
 */

export function isGeminiRateLimitError(e: unknown): boolean {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status?: number }).status;
    if (s === 429) return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /429|Too Many Requests|quota exceeded|rate.?limit/i.test(msg);
}

/**
 * When Google reports free-tier metrics with limit 0, retries usually won't help until billing or daily reset.
 */
export function isLikelyQuotaExhaustedForProject(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /limit:\s*0|GenerateRequestsPerDay|free_tier.*limit:\s*0/i.test(msg);
}

/** Parse "retry in 31.5s" or RetryInfo from error text. */
export function parseRetryAfterMs(e: unknown): number | null {
  const msg = e instanceof Error ? e.message : String(e);
  const sec = msg.match(/retry in ([\d.]+)\s*s/i);
  if (sec) return Math.ceil(parseFloat(sec[1]) * 1000);
  const delay = msg.match(/"retryDelay":"(\d+)s"/i);
  if (delay) return parseInt(delay[1], 10) * 1000;
  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type GeminiRetryOptions = {
  maxAttempts?: number;
  label?: string;
};

/**
 * Retries on 429 with backoff; uses Retry-After hint from Google when present.
 * If quota is truly exhausted (limit:0 across the board), fails after attempts.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  options?: GeminiRetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 5;
  let backoffMs = 2500;
  const label = options?.label ?? "Gemini";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (isLikelyQuotaExhaustedForProject(e)) {
        throw e;
      }
      if (!isGeminiRateLimitError(e) || attempt === maxAttempts - 1) {
        throw e;
      }
      const hinted = parseRetryAfterMs(e);
      const waitMs = Math.min(
        hinted ?? backoffMs,
        120_000,
      );
      console.warn(
        `[${label}] Rate limited (429); attempt ${attempt + 1}/${maxAttempts}, waiting ${waitMs}ms`,
      );
      await sleep(waitMs);
      backoffMs = Math.min(backoffMs * 2, 120_000);
    }
  }
  throw new Error("Gemini retry exhausted");
}

export function userFacingGeminiError(e: unknown): string {
  if (isLikelyQuotaExhaustedForProject(e)) {
    return (
      "Gemini free-tier quota for this API key/project is exhausted (or billing is not enabled). " +
      "Open Google AI Studio → check usage and billing, wait for the daily reset, or use a different Cloud project API key."
    );
  }
  if (isGeminiRateLimitError(e)) {
    return (
      "Gemini API rate limit reached. Wait a minute and retry, or reduce how many AI requests the app makes at once."
    );
  }
  return e instanceof Error ? e.message : "Gemini request failed";
}
