import { trialClassPriceCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  createTrialClassPrice,
  listTrialClassPrices,
} from "@/server/services/trial-class-price.service";

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const active = sp.get("active");
    return ok(
      await listTrialClassPrices({
        levelId: sp.get("levelId") ?? undefined,
        gradeId: sp.get("gradeId") ?? undefined,
        subjectId: sp.get("subjectId") ?? undefined,
        active: active === null ? undefined : active === "true",
      }),
    );
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, trialClassPriceCreateSchema);
    return ok(await createTrialClassPrice(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
