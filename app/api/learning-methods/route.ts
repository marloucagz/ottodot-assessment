import { learningMethodCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  createLearningMethod,
  listLearningMethods,
} from "@/server/services/learning-method.service";

export async function GET(request: Request) {
  try {
    const active = new URL(request.url).searchParams.get("active");
    const rows = await listLearningMethods({
      active: active === null ? undefined : active === "true",
    });
    return ok(rows);
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, learningMethodCreateSchema);
    const row = await createLearningMethod(body);
    return ok(row, 201);
  } catch (error) {
    return handleRoute(error);
  }
}
