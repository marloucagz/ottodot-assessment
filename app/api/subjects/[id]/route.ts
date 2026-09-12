import { subjectUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getSubjectById,
  updateSubject,
} from "@/server/services/subject.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getSubjectById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, subjectUpdateSchema);
    return ok(await updateSubject(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
