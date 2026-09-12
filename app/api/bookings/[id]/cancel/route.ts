import { bookingOwnerSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { cancelBooking } from "@/server/services/booking.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, bookingOwnerSchema);
    const result = await cancelBooking(id, body.userId);
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
