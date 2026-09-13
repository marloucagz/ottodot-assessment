import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnectionString: string | undefined;
};

/** App-level factory options — do not confuse with Prisma.PrismaClientOptions. */
export type CreatePrismaOptions = {
  connectionString?: string;
};

/** @deprecated Use CreatePrismaOptions — kept as alias for existing test imports. */
export type PrismaClientOptions = CreatePrismaOptions;

/**
 * Resolve the Postgres URL for the node-postgres adapter.
 *
 * In development, prefer DIRECT_URL (session mode / :5432). Supabase's
 * transaction pooler (:6543) often fails local Next.js clients with P1000
 * and is a poor fit for interactive `$transaction` — same rationale as
 * `tests/setup.ts`.
 */
function resolveConnectionString(override?: string): string {
  if (override) return override;

  const isProd = process.env.NODE_ENV === "production";
  const connectionString = isProd
    ? (process.env.DATABASE_URL ?? process.env.DIRECT_URL)
    : (process.env.DIRECT_URL ?? process.env.DATABASE_URL);

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Provide it via environment or createPrisma({ connectionString }).",
    );
  }

  return connectionString;
}

function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Injectable Prisma factory. Pass `connectionString` to override env
 * (useful for production injection and tests).
 */
export function createPrisma(options: CreatePrismaOptions = {}) {
  if (options.connectionString) {
    return createPrismaClient(options.connectionString);
  }

  const connectionString = resolveConnectionString();

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaConnectionString !== connectionString
  ) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(connectionString);
    globalForPrisma.prismaConnectionString = connectionString;
  }

  return globalForPrisma.prisma;
}

/**
 * Shared Prisma client (real instance — not a Proxy).
 * In development, reuse across HMR via globalThis.
 */
export const prisma: PrismaClient = createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
