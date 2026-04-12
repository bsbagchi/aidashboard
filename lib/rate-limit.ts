type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const globalBuckets = new Map<string, Bucket>();

function prune(key: string, now: number): Bucket {
  const b = globalBuckets.get(key);
  if (!b || now > b.resetAt) {
    const next = { count: 0, resetAt: now + WINDOW_MS };
    globalBuckets.set(key, next);
    return next;
  }
  return b;
}

/**
 * Simple fixed-window limiter (per server instance). For multi-region production,
 * replace with Redis/Upstash-backed rate limiting.
 */
export function rateLimit(
  key: string,
  maxPerWindow: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = prune(key, now);
  if (bucket.count >= maxPerWindow) {
    return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  bucket.count += 1;
  return { ok: true };
}

export function getClientKey(req: Request): string {
  const h = req.headers.get("x-forwarded-for");
  if (h) return h.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
