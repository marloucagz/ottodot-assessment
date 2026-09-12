import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type LevelSubjectAttachInput = {
  levelId: string;
  subjectId: string;
  active?: boolean;
};

export async function attachLevelSubject(input: LevelSubjectAttachInput) {
  return prisma.$transaction(async (tx) => {
    const level = await tx.level.findUnique({ where: { id: input.levelId } });
    if (!level) {
      throw new AppError("NOT_FOUND", "Level not found", 404);
    }
    const subject = await tx.subject.findUnique({
      where: { id: input.subjectId },
    });
    if (!subject) {
      throw new AppError("NOT_FOUND", "Subject not found", 404);
    }
    return tx.levelSubject.create({
      data: {
        levelId: input.levelId,
        subjectId: input.subjectId,
        active: input.active,
      },
    });
  });
}

export async function listLevelSubjectsByLevel(levelId: string) {
  return prisma.levelSubject.findMany({
    where: { levelId },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function removeLevelSubject(id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.levelSubject.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Level subject not found", 404);
    }
    return tx.levelSubject.delete({ where: { id } });
  });
}
