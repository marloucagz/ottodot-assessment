import { handleRoute, ok } from "@/lib/http";
import { resetDemo } from "@/server/services/demo-seed.service";

export async function POST() {
  try {
    return ok(await resetDemo());
  } catch (error) {
    return handleRoute(error);
  }
}
