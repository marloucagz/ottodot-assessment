import { AppError } from "@/lib/errors";

/**
 * Demo/trial-booking tooling is open in non-production.
 * In production, require DEMO_ENABLED=true and matching x-demo-secret.
 */
export function assertDemoEnabled(request?: Request): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (process.env.DEMO_ENABLED !== "true") {
    throw new AppError(
      "FORBIDDEN",
      "Demo endpoints are disabled in production",
      403,
    );
  }

  const expected = process.env.DEMO_SECRET ?? "";
  if (!expected) {
    throw new AppError(
      "UNAUTHORIZED",
      "DEMO_SECRET is not configured",
      401,
    );
  }

  const provided = request?.headers.get("x-demo-secret");
  if (!provided || provided !== expected) {
    throw new AppError("UNAUTHORIZED", "Invalid demo secret", 401);
  }
}
