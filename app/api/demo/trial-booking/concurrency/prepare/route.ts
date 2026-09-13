import { z } from "zod";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { prepareConcurrencyActors } from "@/server/services/trial-booking-demo.service";

const prepareSchema = z.object({
  count: z.number().int().min(1).max(50),
  childrenPerUser: z.number().int().min(1).max(3).optional(),
});

export async function POST(request: Request) {
  try {
    assertDemoEnabled(request);
    const body = await parseJson(request, prepareSchema);
    return ok(await prepareConcurrencyActors(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
