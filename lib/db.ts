import type { Prisma, PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";

/**
 * Interactive transaction client — same definition Prisma generates for
 * `$transaction(async (tx) => …)` (Omit connection / nested-tx APIs).
 */
export type DbClient = Omit<PrismaClient, ITXClientDenyList>;

export type { Prisma, PrismaClient };
