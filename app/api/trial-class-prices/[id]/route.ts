import { trialClassPriceUpdateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  getTrialClassPriceById,
  updateTrialClassPrice,
} from "@/server/services/trial-class-price.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    return ok(await getTrialClassPriceById(id));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await parseJson(request, trialClassPriceUpdateSchema);
    return ok(await updateTrialClassPrice(id, body));
  } catch (error) {
    return handleRoute(error);
  }
}
