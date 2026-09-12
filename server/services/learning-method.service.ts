import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type LearningMethodCreateInput = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
};

export type LearningMethodUpdateInput = Partial<LearningMethodCreateInput>;

export type LearningMethodListFilters = {
  active?: boolean;
};

export async function createLearningMethod(input: LearningMethodCreateInput) {
  return prisma.$transaction(async (tx) => {
    return tx.learningMethod.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function listLearningMethods(filters: LearningMethodListFilters = {}) {
  return prisma.learningMethod.findMany({
    where: {
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getLearningMethodById(id: string) {
  const row = await prisma.learningMethod.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Learning method not found", 404);
  }
  return row;
}

export async function updateLearningMethod(
  id: string,
  input: LearningMethodUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.learningMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Learning method not found", 404);
    }
    return tx.learningMethod.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function setLearningMethodActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.learningMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Learning method not found", 404);
    }
    return tx.learningMethod.update({
      where: { id },
      data: { active },
    });
  });
}
