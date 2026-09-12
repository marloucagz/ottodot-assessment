import { learningMethodUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getLearningMethodById,
  updateLearningMethod,
} from "@/server/services/learning-method.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getLearningMethodById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, learningMethodUpdateSchema);
    return ok(await updateLearningMethod(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
