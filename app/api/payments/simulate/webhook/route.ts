import { assertPaymentWebhookSecret } from "@/lib/config";
import { paymentWebhookSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { confirmPayment } from "@/server/services/booking.service";

export async function POST(request: Request) {
  try {
    assertPaymentWebhookSecret(request.headers.get("x-webhook-secret"));
    const body = await parseJson(request, paymentWebhookSchema);
    const result = await confirmPayment({
      ...body,
      requireUser: false,
    });
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
