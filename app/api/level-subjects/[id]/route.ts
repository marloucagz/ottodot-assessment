import { handleRoute, ok } from "@/lib/http";
import { removeLevelSubject } from "@/server/services/level-subject.service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return ok(await removeLevelSubject(id));
  } catch (error) {
    return handleRoute(error);
  }
}
