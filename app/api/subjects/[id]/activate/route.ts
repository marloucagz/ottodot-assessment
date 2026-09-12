import { activateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { setSubjectActive } from "@/server/services/subject.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, activateSchema);
    return ok(await setSubjectActive(id, body.active));
  } catch (error) {
    return handleRoute(error);
  }
}
