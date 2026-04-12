import type { LeadStatus } from "./types";

/** Stages considered open pipeline (not closed won/lost). */
export const OPEN_STATUSES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "test_drive",
  "negotiation",
  "order_placed",
] as const;

/** Funnel order for conversion analysis (subset of lifecycle). */
export const FUNNEL_STAGES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "test_drive",
  "negotiation",
  "order_placed",
  "delivered",
] as const;

export function isOpenStatus(status: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}
