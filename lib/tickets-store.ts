import { TICKETS_TABLE, getInstanceName, getSupabase } from "./supabase";
import type {
  NewTicketInput,
  SupportTicket,
  TicketCategory,
  TicketSeverity,
  TicketStatus,
} from "./types";

export type StoreErrorKind = "not_found" | "db_error" | "validation_error";

export class StoreError extends Error {
  readonly kind: StoreErrorKind;
  constructor(kind: StoreErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = "StoreError";
  }
}

const SEVERITY_RANK: Record<TicketSeverity, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

interface DbRow {
  id: string;
  instance_name: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  assigned_to: string;
  reported_by: string;
  resolution: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

function toTicket(row: DbRow): SupportTicket {
  return {
    id: row.id,
    instance_name: row.instance_name,
    ticket_number: row.ticket_number,
    title: row.title,
    description: row.description,
    category: row.category as TicketCategory,
    severity: row.severity as TicketSeverity,
    status: row.status as TicketStatus,
    assigned_to: row.assigned_to,
    reported_by: row.reported_by,
    resolution: row.resolution,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at,
  };
}

function sortTickets(tickets: SupportTicket[]): SupportTicket[] {
  return [...tickets].sort((a, b) => {
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}

export async function listTickets(): Promise<SupportTicket[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TICKETS_TABLE)
    .select("*")
    .eq("instance_name", getInstanceName());

  if (error) throw new StoreError("db_error", error.message);
  return sortTickets(((data as DbRow[] | null) ?? []).map(toTicket));
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TICKETS_TABLE)
    .select("*")
    .eq("instance_name", getInstanceName())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new StoreError("db_error", error.message);
  return data ? toTicket(data as DbRow) : null;
}

export async function ticketCount(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TICKETS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("instance_name", getInstanceName());

  if (error) throw new StoreError("db_error", error.message);
  return count ?? 0;
}

export async function openCount(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TICKETS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("instance_name", getInstanceName())
    .eq("status", "OPEN");

  if (error) throw new StoreError("db_error", error.message);
  return count ?? 0;
}

export async function criticalOpenCount(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TICKETS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("instance_name", getInstanceName())
    .eq("status", "OPEN")
    .eq("severity", "CRITICAL");

  if (error) throw new StoreError("db_error", error.message);
  return count ?? 0;
}

type Patch = Partial<
  Pick<
    DbRow,
    | "status"
    | "severity"
    | "assigned_to"
    | "resolution"
    | "description"
    | "resolved_at"
  >
>;

async function patchById(id: string, patch: Patch): Promise<SupportTicket> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TICKETS_TABLE)
    .update(patch)
    .eq("instance_name", getInstanceName())
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new StoreError("db_error", error.message);
  if (!data) throw new StoreError("not_found", "Ticket not found");
  return toTicket(data as DbRow);
}

export async function updateStatus(
  id: string,
  status: TicketStatus,
  resolution?: string,
): Promise<SupportTicket> {
  const patch: Patch = { status };

  if (status === "RESOLVED" || status === "CLOSED") {
    const trimmed = resolution?.trim() ?? "";
    if (trimmed === "") {
      throw new StoreError(
        "validation_error",
        "resolution is required when status is RESOLVED or CLOSED.",
      );
    }
    patch.resolution = trimmed;
  } else if (resolution !== undefined && resolution.trim() !== "") {
    patch.resolution = resolution.trim();
  }

  if (status === "RESOLVED") {
    patch.resolved_at = new Date().toISOString();
  }

  return patchById(id, patch);
}

export function updateSeverity(
  id: string,
  severity: TicketSeverity,
): Promise<SupportTicket> {
  return patchById(id, { severity });
}

export async function assignTicket(
  id: string,
  assignedTo: string,
): Promise<SupportTicket> {
  const trimmed = assignedTo.trim();
  if (trimmed === "") {
    throw new StoreError(
      "validation_error",
      "assignedTo must be a non-empty string.",
    );
  }
  return patchById(id, { assigned_to: trimmed });
}

export async function addDescription(
  id: string,
  text: string,
): Promise<SupportTicket> {
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new StoreError(
      "validation_error",
      "text must be a non-empty string.",
    );
  }
  const current = await getTicket(id);
  if (!current) throw new StoreError("not_found", "Ticket not found");
  const stamped = `[${new Date().toISOString()}] ${trimmed}`;
  const existing = current.description?.trim() ?? "";
  const merged = existing.length > 0 ? `${existing}\n${stamped}` : stamped;
  return patchById(id, { description: merged });
}

export async function createTicket(
  data: NewTicketInput,
): Promise<SupportTicket> {
  const supabase = getSupabase();
  const row = {
    instance_name: getInstanceName(),
    ticket_number: data.ticket_number,
    title: data.title,
    description: data.description,
    category: data.category,
    severity: data.severity,
    status: "OPEN" as TicketStatus,
    assigned_to:
      data.assigned_to.trim() === "" ? "Unassigned" : data.assigned_to.trim(),
    reported_by: data.reported_by,
    resolution: "",
    resolved_at: null,
  };
  const { data: inserted, error } = await supabase
    .from(TICKETS_TABLE)
    .insert(row)
    .select("*")
    .maybeSingle();
  if (error) throw new StoreError("db_error", error.message);
  if (!inserted) throw new StoreError("db_error", "Insert returned no row");
  return toTicket(inserted as DbRow);
}
