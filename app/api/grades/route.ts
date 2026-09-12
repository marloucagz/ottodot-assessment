import { gradeCreateSchema } from "@/lib/validation/schemas";
import { handleRoute, ok, parseJson } from "@/lib/http";
import { createGrade, listGrades } from "@/server/services/grade.service";

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const active = sp.get("active");
    return ok(
      await listGrades({
        levelId: sp.get("levelId") ?? undefined,
        active: active === null ? undefined : active === "true",
      }),
    );
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, gradeCreateSchema);
    return ok(await createGrade(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
