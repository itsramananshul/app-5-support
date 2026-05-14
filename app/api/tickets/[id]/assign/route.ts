import {
  errorResponse,
  parseAssign,
  readJsonBody,
  runMutation,
} from "@/lib/api-helpers";
import { assignTicket } from "@/lib/tickets-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await readJsonBody(request);
  if (body === null) return errorResponse(400, "Invalid JSON body");
  const parsed = parseAssign(body);
  if (!parsed.ok) return errorResponse(parsed.status, parsed.message);
  return runMutation(() => assignTicket(params.id, parsed.value));
}
