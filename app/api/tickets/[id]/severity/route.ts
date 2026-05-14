import { authenticate } from "@/lib/authenticate";
import {
  errorResponse,
  parseSeverity,
  readJsonBody,
  runMutation,
} from "@/lib/api-helpers";
import { updateSeverity } from "@/lib/tickets-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const authError = await authenticate(request);
  if (authError) return authError;
  const body = await readJsonBody(request);
  if (body === null) return errorResponse(400, "Invalid JSON body");
  const parsed = parseSeverity(body);
  if (!parsed.ok) return errorResponse(parsed.status, parsed.message);
  return runMutation(() => updateSeverity(params.id, parsed.value));
}
