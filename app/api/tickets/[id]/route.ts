import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { CORS_HEADERS, errorResponse, optionsResponse } from "@/lib/api-helpers";
import { StoreError, getTicket } from "@/lib/tickets-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const authError = await authenticate(request);
  if (authError) return authError;
  try {
    const ticket = await getTicket(params.id);
    if (!ticket) return errorResponse(404, "Ticket not found");
    return NextResponse.json(ticket, { headers: CORS_HEADERS });
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

export const OPTIONS = optionsResponse;
