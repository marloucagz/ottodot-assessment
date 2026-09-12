import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

// Prefer direct DB connection for integration tests (pooler can reject local clients).
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

if (!process.env.CRON_SECRET) {
  process.env.CRON_SECRET = "test-cron-secret";
}
if (!process.env.PAYMENT_WEBHOOK_SECRET) {
  process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
}
if (!process.env.RESERVATION_TTL_SECONDS) {
  process.env.RESERVATION_TTL_SECONDS = "300";
}
