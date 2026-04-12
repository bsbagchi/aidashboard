import type { DateRange } from "./types";

/** Parse YYYY-MM-DD as UTC start of day */
export function parseISODateDay(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function startOfUTCDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function endOfUTCDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

const DEFAULT_FROM = "2025-06-01";
const DEFAULT_TO = "2025-12-31";

export function defaultDateRange(): DateRange {
  return {
    from: parseISODateDay(DEFAULT_FROM),
    to: endOfUTCDay(parseISODateDay(DEFAULT_TO)),
  };
}

/**
 * Parse `from` / `to` query params (YYYY-MM-DD). Invalid segments fall back to defaults.
 */
export function parseRangeFromQuery(
  fromStr: string | undefined,
  toStr: string | undefined,
): DateRange {
  const fallback = defaultDateRange();
  if (!fromStr || !toStr) return fallback;

  const from = parseISODateDay(fromStr);
  const to = endOfUTCDay(parseISODateDay(toStr));

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return fallback;
  }
  if (from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isWithinRangeInclusive(t: Date, range: DateRange): boolean {
  return t >= range.from && t <= range.to;
}
