import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { CURRENCY_USD } from "@/lib/constants";
import type { DbClient } from "@/lib/db";

export type TrialClassPriceCreateInput = {
  levelId: string;
  gradeId: string;
  subjectId: string;
  amount: string;
  currency?: "USD";
  sortOrder?: number;
  active?: boolean;
};

export type TrialClassPriceUpdateInput = {
  levelId?: string;
  gradeId?: string;
  subjectId?: string;
  amount?: string;
  currency?: "USD";
  sortOrder?: number;
  active?: boolean;
};

export type TrialClassPriceListFilters = {
  levelId?: string;
  gradeId?: string;
  subjectId?: string;
  active?: boolean;
};

async function assertPriceRelations(
  tx: DbClient,
  input: { levelId: string; gradeId: string; subjectId: string },
) {
  const level = await tx.level.findUnique({ where: { id: input.levelId } });
  if (!level) {
    throw new AppError("NOT_FOUND", "Level not found", 404);
  }

  const grade = await tx.grade.findUnique({ where: { id: input.gradeId } });
  if (!grade) {
    throw new AppError("NOT_FOUND", "Grade not found", 404);
  }
  if (grade.levelId !== input.levelId) {
    throw new AppError(
      "INVALID_GRADE",
      "Grade does not belong to the given level",
      400,
    );
  }

  const subject = await tx.subject.findUnique({
    where: { id: input.subjectId },
  });
  if (!subject) {
    throw new AppError("NOT_FOUND", "Subject not found", 404);
  }

  const levelSubject = await tx.levelSubject.findUnique({
    where: {
      levelId_subjectId: {
        levelId: input.levelId,
        subjectId: input.subjectId,
      },
    },
  });
  if (!levelSubject) {
    throw new AppError(
      "INVALID_SUBJECT",
      "Subject is not attached to the given level",
      400,
    );
  }
}

export async function createTrialClassPrice(input: TrialClassPriceCreateInput) {
  return prisma.$transaction(async (tx) => {
    await assertPriceRelations(tx, input);
    return tx.trialClassPrice.create({
      data: {
        levelId: input.levelId,
        gradeId: input.gradeId,
        subjectId: input.subjectId,
        amount: new Prisma.Decimal(input.amount),
        currency: CURRENCY_USD,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function listTrialClassPrices(
  filters: TrialClassPriceListFilters = {},
) {
  return prisma.trialClassPrice.findMany({
    where: {
      ...(filters.levelId ? { levelId: filters.levelId } : {}),
      ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getTrialClassPriceById(id: string) {
  const row = await prisma.trialClassPrice.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Trial class price not found", 404);
  }
  return row;
}

export async function updateTrialClassPrice(
  id: string,
  input: TrialClassPriceUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassPrice.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class price not found", 404);
    }

    const levelId = input.levelId ?? existing.levelId;
    const gradeId = input.gradeId ?? existing.gradeId;
    const subjectId = input.subjectId ?? existing.subjectId;

    await assertPriceRelations(tx, { levelId, gradeId, subjectId });

    return tx.trialClassPrice.update({
      where: { id },
      data: {
        levelId: input.levelId,
        gradeId: input.gradeId,
        subjectId: input.subjectId,
        ...(input.amount !== undefined
          ? { amount: new Prisma.Decimal(input.amount) }
          : {}),
        currency: CURRENCY_USD,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function setTrialClassPriceActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassPrice.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class price not found", 404);
    }
    return tx.trialClassPrice.update({
      where: { id },
      data: { active },
    });
  });
}
