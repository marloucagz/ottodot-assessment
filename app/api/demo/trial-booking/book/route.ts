import { z } from "zod";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { cuidSchema, bookingStudentSchema } from "@/lib/validation/schemas";
import { createDemoBooking } from "@/server/services/trial-booking-demo.service";

const demoBookSchema = z.object({
  userId: cuidSchema,
  slotId: cuidSchema,
  idempotencyKey: z.string().min(1).optional(),
  students: z.array(bookingStudentSchema).min(1),
  ttlSeconds: z.number().int().min(1).max(60).optional(),
});

export async function POST(request: Request) {
  try {
    assertDemoEnabled(request);
    const body = await parseJson(request, demoBookSchema);
    return ok(await createDemoBooking(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
