import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-helpers";
import { StoreError, getTicket } from "@/lib/tickets-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ticket = await getTicket(params.id);
    if (!ticket) return errorResponse(404, "Ticket not found");
    return NextResponse.json(ticket);
  } catch (e) {
    if (e instanceof StoreError) {
      return errorResponse(500, e.message || "Failed to load ticket");
    }
    return errorResponse(
      500,
      e instanceof Error ? e.message : "Failed to load ticket",
    );
  }
}
