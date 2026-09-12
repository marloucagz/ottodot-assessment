import { paymentConfirmSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { confirmPayment } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, paymentConfirmSchema);
    const result = await confirmPayment({
      ...body,
      requireUser: true,
    });
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
