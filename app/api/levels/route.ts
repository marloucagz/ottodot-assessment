import { levelCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { createLevel, listLevels } from "@/server/services/level.service";

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const active = sp.get("active");
    const rows = await listLevels({
      learningMethodId: sp.get("learningMethodId") ?? undefined,
      active: active === null ? undefined : active === "true",
    });
    return ok(rows);
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, levelCreateSchema);
    return ok(await createLevel(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
