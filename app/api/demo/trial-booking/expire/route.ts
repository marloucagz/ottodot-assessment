import { handleRoute, ok } from "@/lib/http";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { expireReservations } from "@/server/services/booking.service";

/**
 * Triggers the real expire-reservations job without exposing CRON_SECRET to the browser.
 */
export async function POST(request: Request) {
  try {
    assertDemoEnabled(request);
    if (!config.cronSecret) {
      throw new AppError(
        "UNAUTHORIZED",
        "CRON_SECRET is not configured",
        401,
      );
    }
    const result = await expireReservations();
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
