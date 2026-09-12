import { assertCronSecret } from "@/lib/config";
import { handleRoute, ok } from "@/lib/http";
import { reconcileInventory } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    assertCronSecret(request.headers.get("authorization"));
    const result = await reconcileInventory();
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
