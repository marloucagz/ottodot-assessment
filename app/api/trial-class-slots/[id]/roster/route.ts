import { handleRoute, ok } from "@/lib/http";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { getSlotRoster } from "@/server/services/roster.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertDemoEnabled(request);
    const { id } = await context.params;
    return ok(await getSlotRoster(id));
  } catch (error) {
    return handleRoute(error);
  }
}
