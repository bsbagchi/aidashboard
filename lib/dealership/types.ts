export interface DealershipMetadata {
  generated_at: string;
  description: string;
  date_range: string;
  notes: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export type SalesRepRole = "branch_manager" | "sales_officer";

export interface SalesRep {
  id: string;
  name: string;
  branch_id: string;
  role: SalesRepRole;
  joined: string;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "test_drive"
  | "negotiation"
  | "order_placed"
  | "delivered"
  | "lost";

export interface StatusHistoryEntry {
  status: LeadStatus;
  timestamp: string;
  note: string;
}

export interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  source: string;
  model_interested: string;
  status: LeadStatus;
  assigned_to: string;
  branch_id: string;
  created_at: string;
  last_activity_at: string;
  status_history: StatusHistoryEntry[];
  expected_close_date: string;
  deal_value: number;
  lost_reason: string | null;
}

export interface BranchTarget {
  branch_id: string;
  month: string;
  target_units: number;
  target_revenue: number;
}

export interface Delivery {
  lead_id: string;
  order_date: string;
  delivery_date: string;
  days_to_deliver: number;
  delay_reason: string | null;
}

export interface DealershipDataset {
  metadata: DealershipMetadata;
  branches: Branch[];
  sales_reps: SalesRep[];
  leads: Lead[];
  targets: BranchTarget[];
  deliveries: Delivery[];
}

export interface DateRange {
  from: Date;
  to: Date;
}
