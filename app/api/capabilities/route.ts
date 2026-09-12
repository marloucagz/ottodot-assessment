import { capabilityCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  createCapability,
  listCapabilities,
} from "@/server/services/capability.service";

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const active = sp.get("active");
    return ok(
      await listCapabilities({
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
    const body = await parseJson(request, capabilityCreateSchema);
    return ok(await createCapability(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
