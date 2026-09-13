import { createBookingSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { quoteBooking } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, createBookingSchema);
    return ok(await quoteBooking(body));
  } catch (error) {
    return handleRoute(error);
  }
}
