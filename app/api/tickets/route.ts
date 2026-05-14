import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import {
  errorResponse,
  parseNewTicket,
  readJsonBody,
  runMutation,
} from "@/lib/api-helpers";
import { StoreError, createTicket, listTickets } from "@/lib/tickets-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await authenticate(request);
  if (authError) return authError;
  try {
    const tickets = await listTickets();
    return NextResponse.json(tickets);
  } catch (e) {
    if (e instanceof StoreError) {
      return errorResponse(500, e.message || "Failed to load tickets");
    }
    return errorResponse(
      500,
      e instanceof Error ? e.message : "Failed to load tickets",
    );
  }
}

export async function POST(request: Request) {
  const authError = await authenticate(request);
  if (authError) return authError;
  const body = await readJsonBody(request);
  if (body === null) return errorResponse(400, "Invalid JSON body");
  const parsed = parseNewTicket(body);
  if (!parsed.ok) return errorResponse(parsed.status, parsed.message);
  return runMutation(() => createTicket(parsed.value));
}
