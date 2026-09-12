import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type SubjectCreateInput = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
};

export type SubjectUpdateInput = Partial<SubjectCreateInput>;

export type SubjectListFilters = {
  active?: boolean;
};

export async function createSubject(input: SubjectCreateInput) {
  return prisma.$transaction(async (tx) => {
    return tx.subject.create({
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

export async function listSubjects(filters: SubjectListFilters = {}) {
  return prisma.subject.findMany({
    where: {
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getSubjectById(id: string) {
  const row = await prisma.subject.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Subject not found", 404);
  }
  return row;
}

export async function updateSubject(id: string, input: SubjectUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subject.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Subject not found", 404);
    }
    return tx.subject.update({
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

export async function setSubjectActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subject.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Subject not found", 404);
    }
    return tx.subject.update({
      where: { id },
      data: { active },
    });
  });
}
