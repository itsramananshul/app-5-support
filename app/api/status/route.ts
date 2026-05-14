import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-helpers";
import {
  StoreError,
  criticalOpenCount,
  openCount,
  ticketCount,
} from "@/lib/tickets-store";
import type { StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [count, open, criticalOpen] = await Promise.all([
      ticketCount(),
      openCount(),
      criticalOpenCount(),
    ]);
    const payload: StatusResponse = {
      instanceName: process.env.INSTANCE_NAME?.trim() ?? "Unknown Instance",
      type: "support_tickets",
      ticketCount: count,
      openCount: open,
      criticalOpenCount: criticalOpen,
      health: criticalOpen > 0 ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof StoreError) {
      return errorResponse(500, e.message || "Status check failed");
    }
    return errorResponse(
      500,
      e instanceof Error ? e.message : "Status check failed",
    );
  }
}
