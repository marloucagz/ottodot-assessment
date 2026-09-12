import { levelSubjectAttachSchema } from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";
import { handleRoute, ok, parseJson } from "@/lib/http";
import {
  attachLevelSubject,
  listLevelSubjectsByLevel,
} from "@/server/services/level-subject.service";

export async function GET(request: Request) {
  try {
    const levelId = new URL(request.url).searchParams.get("levelId");
    if (!levelId) {
      throw new AppError("VALIDATION_ERROR", "levelId is required", 400);
    }
    return ok(await listLevelSubjectsByLevel(levelId));
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, levelSubjectAttachSchema);
    return ok(await attachLevelSubject(body), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
