import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export type PrismaClientOptions = {
  connectionString?: string;
};

function createPrismaClient(options: PrismaClientOptions = {}) {
  const connectionString =
    options.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Provide it via environment or createPrismaClient({ connectionString }).",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Injectable Prisma singleton. Pass `connectionString` to override env
 * (useful for production injection and tests).
 */
export function createPrisma(options: PrismaClientOptions = {}) {
  if (options.connectionString) {
    return createPrismaClient(options);
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(options);
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = createPrisma();
    return Reflect.get(client, prop, receiver);
  },
});
