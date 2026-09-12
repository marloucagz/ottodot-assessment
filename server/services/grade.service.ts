import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type GradeCreateInput = {
  levelId: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
};

export type GradeUpdateInput = Partial<GradeCreateInput>;

export type GradeListFilters = {
  levelId?: string;
  active?: boolean;
};

export async function createGrade(input: GradeCreateInput) {
  return prisma.$transaction(async (tx) => {
    const level = await tx.level.findUnique({ where: { id: input.levelId } });
    if (!level) {
      throw new AppError("NOT_FOUND", "Level not found", 404);
    }
    return tx.grade.create({
      data: {
        levelId: input.levelId,
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function listGrades(filters: GradeListFilters = {}) {
  return prisma.grade.findMany({
    where: {
      ...(filters.levelId ? { levelId: filters.levelId } : {}),
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getGradeById(id: string) {
  const row = await prisma.grade.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Grade not found", 404);
  }
  return row;
}

export async function updateGrade(id: string, input: GradeUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.grade.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Grade not found", 404);
    }
    if (input.levelId) {
      const level = await tx.level.findUnique({ where: { id: input.levelId } });
      if (!level) {
        throw new AppError("NOT_FOUND", "Level not found", 404);
      }
    }
    return tx.grade.update({
      where: { id },
      data: {
        levelId: input.levelId,
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function setGradeActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.grade.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Grade not found", 404);
    }
    return tx.grade.update({
      where: { id },
      data: { active },
    });
  });
}
