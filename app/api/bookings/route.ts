import { createBookingSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { createBooking } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, createBookingSchema);
    const result = await createBooking(body);
    return ok(result, 201);
  } catch (error) {
    return handleRoute(error);
  }
}
