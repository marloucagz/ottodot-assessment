import { slotCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  createTrialClassSlot,
  listTrialClassSlots,
} from "@/server/services/trial-class-slot.service";

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const active = sp.get("active");
    return ok(
      await listTrialClassSlots({
        scheduleId: sp.get("scheduleId") ?? undefined,
        active: active === null ? undefined : active === "true",
      }),
    );
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, slotCreateSchema);
    return ok(await createTrialClassSlot(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
