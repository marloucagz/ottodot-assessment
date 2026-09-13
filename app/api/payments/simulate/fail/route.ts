import { paymentConfirmSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { failSimulatedPayment } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, paymentConfirmSchema);
    const result = await failSimulatedPayment({
      userId: body.userId,
      paymentId: body.paymentId,
      bookingId: body.bookingId,
    });
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
