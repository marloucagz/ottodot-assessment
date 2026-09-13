import { handleRoute, ok } from "@/lib/http";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { getTrialBookingDemoContext } from "@/server/services/trial-booking-demo.service";

export async function GET(request: Request) {
  try {
    assertDemoEnabled(request);
    return ok(await getTrialBookingDemoContext());
  } catch (error) {
    return handleRoute(error);
  }
}
