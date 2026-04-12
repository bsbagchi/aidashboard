import { FUNNEL_STAGES, isOpenStatus } from "./constants";
import {
  endOfUTCDay,
  isWithinRangeInclusive,
  parseISODateDay,
  startOfUTCDay,
} from "./dates";
import type {
  Branch,
  BranchTarget,
  DateRange,
  DealershipDataset,
  Delivery,
  Lead,
  LeadStatus,
  SalesRep,
} from "./types";

export interface OverviewKpis {
  newLeads: number;
  deliveredUnits: number;
  deliveredRevenue: number;
  pipelineOpenCount: number;
  pipelineOpenValue: number;
  lostLeads: number;
}

export interface BranchRow {
  branch: Branch;
  newLeads: number;
  deliveredUnits: number;
  deliveredRevenue: number;
  pipelineValue: number;
  targetUnitsMonth: number | null;
  targetRevenueMonth: number | null;
  /** Primary month label used for target columns (YYYY-MM) */
  targetMonthLabel: string | null;
  attainmentUnits: number | null;
  attainmentRevenue: number | null;
}

export interface RepRow {
  rep: SalesRep;
  branch: Branch;
  newLeads: number;
  deliveredUnits: number;
  deliveredRevenue: number;
  pipelineValue: number;
}

export interface MonthlyPoint {
  month: string;
  targetUnits: number;
  deliveredUnits: number;
}

export interface FunnelStageCount {
  stage: LeadStatus;
  reached: number;
}

export interface StaleLead {
  lead: Lead;
  branch: Branch;
  rep: SalesRep;
  daysSinceActivity: number;
}

export interface TargetGapInsight {
  branch: Branch;
  month: string;
  targetUnits: number;
  deliveredUnits: number;
  gapUnits: number;
  pctOfTarget: number;
  daysRemainingInMonth: number;
}

export function buildLeadMap(leads: Lead[]): Map<string, Lead> {
  return new Map(leads.map((l) => [l.id, l]));
}

export function leadCreatedInRange(lead: Lead, range: DateRange): boolean {
  const t = new Date(lead.created_at);
  return isWithinRangeInclusive(t, range);
}

export function deliveryInRange(d: Delivery, range: DateRange): boolean {
  const t = parseISODateDay(d.delivery_date);
  return isWithinRangeInclusive(t, range);
}

export function lostEventInRange(lead: Lead, range: DateRange): boolean {
  if (lead.status !== "lost") return false;
  const lost = [...lead.status_history]
    .reverse()
    .find((h) => h.status === "lost");
  if (!lost) return false;
  return isWithinRangeInclusive(new Date(lost.timestamp), range);
}

export function reachedStage(lead: Lead, stage: LeadStatus): boolean {
  return lead.status_history.some((h) => h.status === stage);
}

export function getOverviewKpis(
  data: DealershipDataset,
  range: DateRange,
  scope?: { branchId?: string | null; repId?: string | null },
): OverviewKpis {
  const leadMap = buildLeadMap(data.leads);
  const { branchId, repId } = scope ?? {};

  const matchesScope = (lead: Lead): boolean => {
    if (repId && lead.assigned_to !== repId) return false;
    if (!repId && branchId && lead.branch_id !== branchId) return false;
    return true;
  };

  let newLeads = 0;
  let deliveredUnits = 0;
  let deliveredRevenue = 0;
  let lostLeads = 0;
  let pipelineOpenCount = 0;
  let pipelineOpenValue = 0;

  for (const lead of data.leads) {
    if (!matchesScope(lead)) continue;
    if (leadCreatedInRange(lead, range)) newLeads += 1;
    if (lostEventInRange(lead, range)) lostLeads += 1;
  }

  for (const d of data.deliveries) {
    if (!deliveryInRange(d, range)) continue;
    const lead = leadMap.get(d.lead_id);
    if (!lead || !matchesScope(lead)) continue;
    deliveredUnits += 1;
    deliveredRevenue += lead.deal_value;
  }

  const rangeEnd = endOfUTCDay(range.to);
  for (const lead of data.leads) {
    if (!matchesScope(lead)) continue;
    if (!isOpenStatus(lead.status)) continue;
    const last = new Date(lead.last_activity_at);
    if (last > rangeEnd) continue;
    pipelineOpenCount += 1;
    pipelineOpenValue += lead.deal_value;
  }

  return {
    newLeads,
    deliveredUnits,
    deliveredRevenue,
    pipelineOpenCount,
    pipelineOpenValue,
    lostLeads,
  };
}

function filterLeadsForScope(
  leads: Lead[],
  branchId: string | null,
): Lead[] {
  if (!branchId) return leads;
  return leads.filter((l) => l.branch_id === branchId);
}

function filterDeliveriesForScope(
  deliveries: Delivery[],
  leadMap: Map<string, Lead>,
  branchId: string | null,
): Delivery[] {
  if (!branchId) return deliveries;
  return deliveries.filter((d) => {
    const lead = leadMap.get(d.lead_id);
    return lead?.branch_id === branchId;
  });
}

/** Last calendar month fully or partially covered by `range` (for target comparison). */
export function pickTargetMonthKey(range: DateRange): string {
  const end = startOfUTCDay(range.to);
  const y = end.getUTCFullYear();
  const m = end.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function getTargetsForMonth(
  targets: BranchTarget[],
  month: string,
): Map<string, BranchTarget> {
  const map = new Map<string, BranchTarget>();
  for (const t of targets) {
    if (t.month === month) map.set(t.branch_id, t);
  }
  return map;
}

export function deliveriesInMonthForBranch(
  deliveries: Delivery[],
  leadMap: Map<string, Lead>,
  branchId: string,
  month: string,
): { units: number; revenue: number } {
  let units = 0;
  let revenue = 0;
  for (const d of deliveries) {
    if (!d.delivery_date.startsWith(month)) continue;
    const lead = leadMap.get(d.lead_id);
    if (!lead || lead.branch_id !== branchId) continue;
    units += 1;
    revenue += lead.deal_value;
  }
  return { units, revenue };
}

export function getBranchTable(
  data: DealershipDataset,
  range: DateRange,
  branchFilter: string | null,
): BranchRow[] {
  const leadMap = buildLeadMap(data.leads);
  const monthKey = pickTargetMonthKey(range);
  const targetsMap = getTargetsForMonth(data.targets, monthKey);
  const scopedLeads = filterLeadsForScope(data.leads, branchFilter);
  const scopedDeliveries = filterDeliveriesForScope(
    data.deliveries,
    leadMap,
    branchFilter,
  );

  const rows: BranchRow[] = [];

  for (const branch of data.branches) {
    if (branchFilter && branch.id !== branchFilter) continue;

    let newLeads = 0;
    for (const l of scopedLeads) {
      if (l.branch_id !== branch.id) continue;
      if (leadCreatedInRange(l, range)) newLeads += 1;
    }

    let deliveredUnits = 0;
    let deliveredRevenue = 0;
    for (const d of scopedDeliveries) {
      const lead = leadMap.get(d.lead_id);
      if (!lead || lead.branch_id !== branch.id) continue;
      if (!deliveryInRange(d, range)) continue;
      deliveredUnits += 1;
      deliveredRevenue += lead.deal_value;
    }

    let pipelineValue = 0;
    const rangeEnd = endOfUTCDay(range.to);
    for (const l of data.leads) {
      if (l.branch_id !== branch.id) continue;
      if (!isOpenStatus(l.status)) continue;
      if (new Date(l.last_activity_at) > rangeEnd) continue;
      pipelineValue += l.deal_value;
    }

    const t = targetsMap.get(branch.id);
    const { units: monthUnits } = deliveriesInMonthForBranch(
      data.deliveries,
      leadMap,
      branch.id,
      monthKey,
    );

    let attainmentUnits: number | null = null;
    let attainmentRevenue: number | null = null;
    if (t && t.target_units > 0) {
      attainmentUnits = monthUnits / t.target_units;
    }
    if (t && t.target_revenue > 0) {
      const { revenue: monthRev } = deliveriesInMonthForBranch(
        data.deliveries,
        leadMap,
        branch.id,
        monthKey,
      );
      attainmentRevenue = monthRev / t.target_revenue;
    }

    rows.push({
      branch,
      newLeads,
      deliveredUnits,
      deliveredRevenue,
      pipelineValue,
      targetUnitsMonth: t?.target_units ?? null,
      targetRevenueMonth: t?.target_revenue ?? null,
      targetMonthLabel: t ? monthKey : null,
      attainmentUnits,
      attainmentRevenue,
    });
  }

  return rows.sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);
}

export function getRepTable(
  data: DealershipDataset,
  range: DateRange,
  branchFilter: string | null,
): RepRow[] {
  const leadMap = buildLeadMap(data.leads);
  const branchById = new Map(data.branches.map((b) => [b.id, b]));
  const rows: RepRow[] = [];

  for (const rep of data.sales_reps) {
    if (branchFilter && rep.branch_id !== branchFilter) continue;
    const branch = branchById.get(rep.branch_id);
    if (!branch) continue;

    let newLeads = 0;
    let deliveredUnits = 0;
    let deliveredRevenue = 0;
    let pipelineValue = 0;

    for (const lead of data.leads) {
      if (lead.assigned_to !== rep.id) continue;
      if (leadCreatedInRange(lead, range)) newLeads += 1;
      if (isOpenStatus(lead.status)) {
        const last = new Date(lead.last_activity_at);
        if (last <= endOfUTCDay(range.to)) pipelineValue += lead.deal_value;
      }
    }

    for (const d of data.deliveries) {
      if (!deliveryInRange(d, range)) continue;
      const lead = leadMap.get(d.lead_id);
      if (!lead || lead.assigned_to !== rep.id) continue;
      deliveredUnits += 1;
      deliveredRevenue += lead.deal_value;
    }

    rows.push({
      rep,
      branch,
      newLeads,
      deliveredUnits,
      deliveredRevenue,
      pipelineValue,
    });
  }

  return rows.sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);
}

export function getMonthlyTrend(
  data: DealershipDataset,
  range: DateRange,
  branchFilter: string | null,
): MonthlyPoint[] {
  const leadMap = buildLeadMap(data.leads);
  const months = enumerateMonths(range);
  const points: MonthlyPoint[] = [];

  for (const month of months) {
    let targetUnits = 0;
    if (branchFilter) {
      const t = data.targets.find(
        (x) => x.branch_id === branchFilter && x.month === month,
      );
      targetUnits = t?.target_units ?? 0;
    } else {
      for (const t of data.targets) {
        if (t.month === month) targetUnits += t.target_units;
      }
    }

    let deliveredUnits = 0;
    for (const d of data.deliveries) {
      if (!d.delivery_date.startsWith(month)) continue;
      const lead = leadMap.get(d.lead_id);
      if (!lead) continue;
      if (branchFilter && lead.branch_id !== branchFilter) continue;
      deliveredUnits += 1;
    }

    points.push({ month, targetUnits, deliveredUnits });
  }

  return points;
}

function enumerateMonths(range: DateRange): string[] {
  const out: string[] = [];
  const cur = new Date(
    Date.UTC(
      range.from.getUTCFullYear(),
      range.from.getUTCMonth(),
      1,
    ),
  );
  const end = new Date(
    Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1),
  );
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth() + 1;
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

export function getFunnelForLeadsCreatedInRange(
  leads: Lead[],
  range: DateRange,
): FunnelStageCount[] {
  const scoped = leads.filter((l) => leadCreatedInRange(l, range));
  const stages = FUNNEL_STAGES;
  return stages.map((stage) => ({
    stage,
    reached: scoped.filter((l) => reachedStage(l, stage)).length,
  }));
}

export function getStaleOpenLeads(
  data: DealershipDataset,
  range: DateRange,
  branchFilter: string | null,
  staleDays = 7,
): StaleLead[] {
  const ref = endOfUTCDay(range.to);
  const threshold = new Date(ref);
  threshold.setUTCDate(threshold.getUTCDate() - staleDays);

  const branchMap = new Map(data.branches.map((b) => [b.id, b]));
  const repMap = new Map(data.sales_reps.map((r) => [r.id, r]));
  const out: StaleLead[] = [];

  for (const lead of data.leads) {
    if (branchFilter && lead.branch_id !== branchFilter) continue;
    if (!isOpenStatus(lead.status)) continue;
    const last = new Date(lead.last_activity_at);
    if (last >= threshold) continue;
    if (new Date(lead.created_at) > ref) continue;

    const branch = branchMap.get(lead.branch_id);
    const rep = repMap.get(lead.assigned_to);
    if (!branch || !rep) continue;

    const daysSinceActivity = Math.floor(
      (ref.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );

    out.push({ lead, branch, rep, daysSinceActivity });
  }

  return out.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
}

/** Branch most behind unit target for the month ending at `range.to`. */
export function getLargestTargetGap(
  data: DealershipDataset,
  range: DateRange,
): TargetGapInsight | null {
  const monthKey = pickTargetMonthKey(range);
  const leadMap = buildLeadMap(data.leads);
  const targetsMap = getTargetsForMonth(data.targets, monthKey);

  let worst: TargetGapInsight | null = null;

  const [ty, tm] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const dayOfRangeEnd = Math.min(range.to.getUTCDate(), daysInMonth);
  const daysRemainingInMonth = Math.max(0, daysInMonth - dayOfRangeEnd);

  for (const branch of data.branches) {
    const t = targetsMap.get(branch.id);
    if (!t || t.target_units <= 0) continue;
    const { units } = deliveriesInMonthForBranch(
      data.deliveries,
      leadMap,
      branch.id,
      monthKey,
    );
    const pct = units / t.target_units;
    if (pct >= 1) continue;
    const gapUnits = t.target_units - units;
    const candidate: TargetGapInsight = {
      branch,
      month: monthKey,
      targetUnits: t.target_units,
      deliveredUnits: units,
      gapUnits,
      pctOfTarget: pct,
      daysRemainingInMonth,
    };
    if (
      !worst ||
      candidate.pctOfTarget < worst.pctOfTarget ||
      (candidate.pctOfTarget === worst.pctOfTarget &&
        candidate.gapUnits > worst.gapUnits)
    ) {
      worst = candidate;
    }
  }

  return worst;
}

/** Leads with creation or last activity touching the selected window (for drill-down tables). */
export function getLeadsTouchingRange(
  leads: Lead[],
  range: DateRange,
  options: { branchId?: string | null; repId?: string | null } = {},
): Lead[] {
  const { branchId, repId } = options;
  return leads.filter((l) => {
    if (branchId && l.branch_id !== branchId) return false;
    if (repId && l.assigned_to !== repId) return false;
    const c = new Date(l.created_at);
    const a = new Date(l.last_activity_at);
    return (
      isWithinRangeInclusive(c, range) || isWithinRangeInclusive(a, range)
    );
  });
}

export function sourceBreakdown(
  leads: Lead[],
  range: DateRange,
): { source: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of leads) {
    if (!leadCreatedInRange(l, range)) continue;
    map.set(l.source, (map.get(l.source) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
