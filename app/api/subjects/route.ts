import { subjectCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { createSubject, listSubjects } from "@/server/services/subject.service";

export async function GET(request: Request) {
  try {
    const active = new URL(request.url).searchParams.get("active");
    return ok(
      await listSubjects({
        active: active === null ? undefined : active === "true",
      }),
    );
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, subjectCreateSchema);
    return ok(await createSubject(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
