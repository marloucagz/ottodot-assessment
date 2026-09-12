import { scheduleCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  createTrialClassSchedule,
  listTrialClassSchedules,
} from "@/server/services/trial-class-schedule.service";

export async function GET(request: Request) {
  try {
    const active = new URL(request.url).searchParams.get("active");
    return ok(
      await listTrialClassSchedules({
        active: active === null ? undefined : active === "true",
      }),
    );
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, scheduleCreateSchema);
    return ok(await createTrialClassSchedule(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
