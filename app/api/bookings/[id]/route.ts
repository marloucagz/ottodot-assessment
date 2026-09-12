import { AppError } from "@/lib/errors";
import { handleRoute, ok } from "@/lib/http";
import { getBooking } from "@/server/services/booking.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) {
      throw new AppError("VALIDATION_ERROR", "userId is required", 400);
    }
    const result = await getBooking(id, userId);
    return ok(result);
  } catch (error) {
    return handleRoute(error);
  }
}
