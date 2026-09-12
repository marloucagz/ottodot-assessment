import { AppError } from "@/lib/errors";

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  reservationTtlSeconds: readInt("RESERVATION_TTL_SECONDS", 300),
  cronSecret: process.env.CRON_SECRET ?? "",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  currency: "USD" as const,
};

export function assertCronSecret(authHeader: string | null): void {
  const expected = config.cronSecret;
  if (!expected) {
    throw new AppError(
      "UNAUTHORIZED",
      "CRON_SECRET is not configured",
      401,
    );
  }
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : authHeader;
  if (!token || token !== expected) {
    throw new AppError("UNAUTHORIZED", "Invalid cron secret", 401);
  }
}

export function assertPaymentWebhookSecret(secret: string | null): void {
  const expected = config.paymentWebhookSecret;
  if (!expected) {
    throw new AppError(
      "UNAUTHORIZED",
      "PAYMENT_WEBHOOK_SECRET is not configured",
      401,
    );
  }
  if (!secret || secret !== expected) {
    throw new AppError("UNAUTHORIZED", "Invalid webhook secret", 401);
  }
}
