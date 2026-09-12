import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type LevelCreateInput = {
  learningMethodId: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
};

export type LevelUpdateInput = Partial<LevelCreateInput>;

export type LevelListFilters = {
  learningMethodId?: string;
  active?: boolean;
};

export async function createLevel(input: LevelCreateInput) {
  return prisma.$transaction(async (tx) => {
    const learningMethod = await tx.learningMethod.findUnique({
      where: { id: input.learningMethodId },
    });
    if (!learningMethod) {
      throw new AppError("NOT_FOUND", "Learning method not found", 404);
    }
    return tx.level.create({
      data: {
        learningMethodId: input.learningMethodId,
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function listLevels(filters: LevelListFilters = {}) {
  return prisma.level.findMany({
    where: {
      ...(filters.learningMethodId
        ? { learningMethodId: filters.learningMethodId }
        : {}),
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getLevelById(id: string) {
  const row = await prisma.level.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Level not found", 404);
  }
  return row;
}

export async function updateLevel(id: string, input: LevelUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.level.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Level not found", 404);
    }
    if (input.learningMethodId) {
      const learningMethod = await tx.learningMethod.findUnique({
        where: { id: input.learningMethodId },
      });
      if (!learningMethod) {
        throw new AppError("NOT_FOUND", "Learning method not found", 404);
      }
    }
    return tx.level.update({
      where: { id },
      data: {
        learningMethodId: input.learningMethodId,
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function setLevelActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.level.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Level not found", 404);
    }
    return tx.level.update({
      where: { id },
      data: { active },
    });
  });
}
