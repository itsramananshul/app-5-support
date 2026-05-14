import { NextResponse } from "next/server";
import { StoreError } from "./tickets-store";
import {
  TICKET_CATEGORIES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  type ApiErrorBody,
  type MutationSuccessBody,
  type NewTicketInput,
  type SupportTicket,
  type TicketCategory,
  type TicketSeverity,
  type TicketStatus,
} from "./types";

export function errorResponse(status: number, message: string) {
  return NextResponse.json<ApiErrorBody>(
    { success: false, error: message },
    { status },
  );
}

export function mutationSuccessResponse(ticket: SupportTicket) {
  return NextResponse.json<MutationSuccessBody>({
    success: true,
    ticket,
  });
}

export function mapStoreError(e: StoreError) {
  switch (e.kind) {
    case "not_found":
      return errorResponse(404, e.message || "Ticket not found");
    case "validation_error":
      return errorResponse(400, e.message || "Validation failed");
    case "db_error":
      return errorResponse(500, e.message || "Database error");
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function runMutation(
  fn: () => Promise<SupportTicket>,
): Promise<Response> {
  try {
    const ticket = await fn();
    return mutationSuccessResponse(ticket);
  } catch (e) {
    if (e instanceof StoreError) return mapStoreError(e);
    const message = e instanceof Error ? e.message : "Server error";
    return errorResponse(500, message);
  }
}

export type FieldParse<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

export interface StatusUpdatePayload {
  status: TicketStatus;
  resolution?: string;
}

export function parseStatusUpdate(
  body: unknown,
): FieldParse<StatusUpdatePayload> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const b = body as { status?: unknown; resolution?: unknown };
  if (typeof b.status !== "string") {
    return { ok: false, status: 400, message: "status must be a string" };
  }
  if (!TICKET_STATUSES.includes(b.status as TicketStatus)) {
    return {
      ok: false,
      status: 400,
      message: `status must be one of: ${TICKET_STATUSES.join(", ")}`,
    };
  }
  const status = b.status as TicketStatus;

  let resolution: string | undefined;
  if (b.resolution !== undefined) {
    if (typeof b.resolution !== "string") {
      return {
        ok: false,
        status: 400,
        message: "resolution must be a string when provided",
      };
    }
    resolution = b.resolution;
  }

  if (
    (status === "RESOLVED" || status === "CLOSED") &&
    (!resolution || resolution.trim() === "")
  ) {
    return {
      ok: false,
      status: 400,
      message: "resolution is required when status is RESOLVED or CLOSED.",
    };
  }

  return { ok: true, value: { status, resolution } };
}

export function parseSeverity(body: unknown): FieldParse<TicketSeverity> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const value = (body as { severity?: unknown }).severity;
  if (typeof value !== "string") {
    return { ok: false, status: 400, message: "severity must be a string" };
  }
  if (!TICKET_SEVERITIES.includes(value as TicketSeverity)) {
    return {
      ok: false,
      status: 400,
      message: `severity must be one of: ${TICKET_SEVERITIES.join(", ")}`,
    };
  }
  return { ok: true, value: value as TicketSeverity };
}

export function parseAssign(body: unknown): FieldParse<string> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const value = (body as { assignedTo?: unknown }).assignedTo;
  if (typeof value !== "string" || value.trim() === "") {
    return {
      ok: false,
      status: 400,
      message: "assignedTo must be a non-empty string",
    };
  }
  return { ok: true, value };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function parseNewTicket(body: unknown): FieldParse<NewTicketInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.ticket_number)) {
    return { ok: false, status: 400, message: "ticket_number is required" };
  }
  if (!isNonEmptyString(b.title)) {
    return { ok: false, status: 400, message: "title is required" };
  }
  if (!isNonEmptyString(b.reported_by)) {
    return { ok: false, status: 400, message: "reported_by is required" };
  }
  if (
    typeof b.category !== "string" ||
    !TICKET_CATEGORIES.includes(b.category as TicketCategory)
  ) {
    return {
      ok: false,
      status: 400,
      message: `category must be one of: ${TICKET_CATEGORIES.join(", ")}`,
    };
  }
  if (
    typeof b.severity !== "string" ||
    !TICKET_SEVERITIES.includes(b.severity as TicketSeverity)
  ) {
    return {
      ok: false,
      status: 400,
      message: `severity must be one of: ${TICKET_SEVERITIES.join(", ")}`,
    };
  }

  const description = typeof b.description === "string" ? b.description : "";
  const assigned_to =
    typeof b.assigned_to === "string" && b.assigned_to.trim() !== ""
      ? b.assigned_to
      : "Unassigned";

  return {
    ok: true,
    value: {
      ticket_number: b.ticket_number,
      title: b.title,
      description,
      category: b.category as TicketCategory,
      severity: b.severity as TicketSeverity,
      assigned_to,
      reported_by: b.reported_by,
    },
  };
}
