import { capabilityUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getCapabilityById,
  updateCapability,
} from "@/server/services/capability.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getCapabilityById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, capabilityUpdateSchema);
    return ok(await updateCapability(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
