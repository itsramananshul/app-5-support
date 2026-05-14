export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketCategory =
  | "EQUIPMENT"
  | "IT"
  | "SAFETY"
  | "QUALITY"
  | "GENERAL";

export interface SupportTicket {
  id: string;
  instance_name: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  severity: TicketSeverity;
  status: TicketStatus;
  assigned_to: string;
  reported_by: string;
  resolution: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface StatusResponse {
  instanceName: string;
  type: "support_tickets";
  ticketCount: number;
  openCount: number;
  criticalOpenCount: number;
  health: "ok" | "degraded";
  timestamp: string;
}

export interface ApiErrorBody {
  success: false;
  error: string;
}

export interface MutationSuccessBody {
  success: true;
  ticket: SupportTicket;
}

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const TICKET_SEVERITIES: readonly TicketSeverity[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export const TICKET_CATEGORIES: readonly TicketCategory[] = [
  "EQUIPMENT",
  "IT",
  "SAFETY",
  "QUALITY",
  "GENERAL",
];

export interface NewTicketInput {
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  severity: TicketSeverity;
  assigned_to: string;
  reported_by: string;
}
