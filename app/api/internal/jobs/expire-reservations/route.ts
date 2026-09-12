import { assertCronSecret } from "@/lib/config";
import { handleRoute, ok } from "@/lib/http";
import { expireReservations } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    assertCronSecret(request.headers.get("authorization"));
    const result = await expireReservations();
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
