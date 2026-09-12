import { slotCancelSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { cancelTrialClassSlot } from "@/server/services/trial-class-slot.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, slotCancelSchema);
    return ok(await cancelTrialClassSlot(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
