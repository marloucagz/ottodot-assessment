import { userUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { getUserById, updateUser } from "@/server/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getUserById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, userUpdateSchema);
    return ok(await updateUser(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
