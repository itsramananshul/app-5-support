import { NextRequest, NextResponse } from "next/server";
import {
  listTickets,
  getTicket,
  ticketCount,
  openCount,
  criticalOpenCount,
  updateStatus,
  updateSeverity,
  assignTicket,
  addDescription,
  createTicket,
  StoreError,
} from "@/lib/tickets-store";
import type { NewTicketInput, TicketSeverity, TicketStatus } from "@/lib/types";

function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function storeErr(e: unknown) {
  const kind = e instanceof StoreError ? e.kind : "internal_error";
  const status = e instanceof StoreError && e.kind === "not_found" ? 404 : 409;
  return NextResponse.json({ ok: false, error: kind }, { status });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("invalid JSON body");
  }

  const { capability, ...params } = body;

  try {
    switch (capability) {
      case "support.list": {
        const tickets = await listTickets();
        return NextResponse.json({ ok: true, result: tickets });
      }

      case "support.get": {
        if (!params.id || typeof params.id !== "string")
          return err("id is required");
        const ticket = await getTicket(params.id);
        if (!ticket) return err("Ticket not found", 404);
        return NextResponse.json({ ok: true, result: ticket });
      }

      case "support.status": {
        const [total, open, critical] = await Promise.all([
          ticketCount(),
          openCount(),
          criticalOpenCount(),
        ]);
        return NextResponse.json({
          ok: true,
          result: {
            instanceName: process.env.INSTANCE_NAME ?? "unknown",
            type: "support_tickets",
            ticketCount: total,
            openCount: open,
            criticalOpenCount: critical,
            health: "ok",
            timestamp: new Date().toISOString(),
          },
        });
      }

      case "support.update_status": {
        if (!params.id || typeof params.id !== "string")
          return err("id is required");
        if (!params.status || typeof params.status !== "string")
          return err("status is required");
        const resolution =
          typeof params.resolution === "string" ? params.resolution : undefined;
        try {
          const ticket = await updateStatus(
            params.id,
            params.status as TicketStatus,
            resolution,
          );
          return NextResponse.json({ ok: true, result: ticket });
        } catch (e) {
          return storeErr(e);
        }
      }

      case "support.update_severity": {
        if (!params.id || typeof params.id !== "string")
          return err("id is required");
        if (!params.severity || typeof params.severity !== "string")
          return err("severity is required");
        try {
          const ticket = await updateSeverity(params.id, params.severity as TicketSeverity);
          return NextResponse.json({ ok: true, result: ticket });
        } catch (e) {
          return storeErr(e);
        }
      }

      case "support.assign": {
        if (!params.id || typeof params.id !== "string")
          return err("id is required");
        if (!params.assigned_to || typeof params.assigned_to !== "string")
          return err("assigned_to is required");
        try {
          const ticket = await assignTicket(params.id, params.assigned_to);
          return NextResponse.json({ ok: true, result: ticket });
        } catch (e) {
          return storeErr(e);
        }
      }

      case "support.add_description": {
        if (!params.id || typeof params.id !== "string")
          return err("id is required");
        if (!params.text || typeof params.text !== "string")
          return err("text is required");
        try {
          const ticket = await addDescription(params.id, params.text);
          return NextResponse.json({ ok: true, result: ticket });
        } catch (e) {
          return storeErr(e);
        }
      }

      case "support.create": {
        try {
          const ticket = await createTicket(params as unknown as NewTicketInput);
          return NextResponse.json({ ok: true, result: ticket });
        } catch (e) {
          return storeErr(e);
        }
      }

      default:
        return err(`unknown capability: ${capability}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return err(message, 500);
  }
}
