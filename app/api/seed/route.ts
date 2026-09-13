import { handleRoute, ok } from "@/lib/http";
import {
  getSeedStatus,
  seedDemo,
} from "@/server/services/demo-seed.service";

export async function GET() {
  try {
    return ok(await getSeedStatus());
  } catch (error) {
    return handleRoute(error);
  }
}

export async function POST() {
  try {
    return ok(await seedDemo(), 201);
  } catch (error) {
    return handleRoute(error);
  }
}
