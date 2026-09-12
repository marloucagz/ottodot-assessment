import { activateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { setLearningMethodActive } from "@/server/services/learning-method.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, activateSchema);
    return ok(await setLearningMethodActive(id, body.active));
  } catch (error) {
    return handleRoute(error);
  }
}
