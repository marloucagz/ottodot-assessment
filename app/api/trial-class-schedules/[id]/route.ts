import { scheduleUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getTrialClassScheduleById,
  updateTrialClassSchedule,
} from "@/server/services/trial-class-schedule.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getTrialClassScheduleById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, scheduleUpdateSchema);
    return ok(await updateTrialClassSchedule(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
