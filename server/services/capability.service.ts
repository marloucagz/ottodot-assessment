import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type CapabilityCreateInput = {
  subjectId?: string | null;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
};

export type CapabilityUpdateInput = Partial<CapabilityCreateInput>;

export type CapabilityListFilters = {
  subjectId?: string | null;
  active?: boolean;
};

export async function createCapability(input: CapabilityCreateInput) {
  return prisma.$transaction(async (tx) => {
    if (input.subjectId) {
      const subject = await tx.subject.findUnique({
        where: { id: input.subjectId },
      });
      if (!subject) {
        throw new AppError("NOT_FOUND", "Subject not found", 404);
      }
    }
    return tx.capability.create({
      data: {
        subjectId: input.subjectId ?? null,
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function listCapabilities(filters: CapabilityListFilters = {}) {
  return prisma.capability.findMany({
    where: {
      ...(filters.subjectId !== undefined
        ? { subjectId: filters.subjectId }
        : {}),
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getCapabilityById(id: string) {
  const row = await prisma.capability.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Capability not found", 404);
  }
  return row;
}

export async function updateCapability(
  id: string,
  input: CapabilityUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.capability.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Capability not found", 404);
    }
    if (input.subjectId) {
      const subject = await tx.subject.findUnique({
        where: { id: input.subjectId },
      });
      if (!subject) {
        throw new AppError("NOT_FOUND", "Subject not found", 404);
      }
    }
    return tx.capability.update({
      where: { id },
      data: {
        subjectId: input.subjectId,
        code: input.code,
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

export async function setCapabilityActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.capability.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Capability not found", 404);
    }
    return tx.capability.update({
      where: { id },
      data: { active },
    });
  });
}
