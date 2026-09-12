import { gradeUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { getGradeById, updateGrade } from "@/server/services/grade.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getGradeById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, gradeUpdateSchema);
    return ok(await updateGrade(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
