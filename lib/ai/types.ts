export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface ChatContextFilter {
  from: string;
  to: string;
  branchId: string | null;
}

export interface InsightsResponse {
  summary: string;
  bullets: string[];
  risks: string[];
  opportunities: string[];
  suggestedQueries: string[];
}

export interface ParseFiltersResponse {
  from: string | null;
  to: string | null;
  branchId: string | null;
  confidence: number;
  rationale: string;
}
