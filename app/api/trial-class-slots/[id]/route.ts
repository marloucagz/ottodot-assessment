import { slotUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getTrialClassSlotById,
  updateTrialClassSlot,
} from "@/server/services/trial-class-slot.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getTrialClassSlotById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, slotUpdateSchema);
    return ok(await updateTrialClassSlot(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
