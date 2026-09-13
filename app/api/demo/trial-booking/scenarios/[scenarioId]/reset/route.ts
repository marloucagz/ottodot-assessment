import { handleRoute, ok } from "@/lib/http";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { resetDemoScenario } from "@/server/services/trial-booking-demo.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ scenarioId: string }> },
) {
  try {
    assertDemoEnabled(request);
    const { scenarioId } = await context.params;
    return ok(await resetDemoScenario(scenarioId));
  } catch (error) {
    return handleRoute(error);
  }
}
