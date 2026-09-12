import { levelUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getLevelById,
  updateLevel,
} from "@/server/services/level.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getLevelById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, levelUpdateSchema);
    return ok(await updateLevel(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
