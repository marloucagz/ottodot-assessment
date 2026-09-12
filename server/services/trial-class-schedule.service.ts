import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type TrialClassScheduleCreateInput = {
  code?: string;
  name?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone?: string;
  active?: boolean;
};

export type TrialClassScheduleUpdateInput =
  Partial<TrialClassScheduleCreateInput>;

export type TrialClassScheduleListFilters = {
  active?: boolean;
  dayOfWeek?: number;
};

function assertStartBeforeEnd(startTime: string, endTime: string) {
  if (startTime >= endTime) {
    throw new AppError(
      "VALIDATION_ERROR",
      "startTime must be before endTime",
      400,
    );
  }
}

export async function createTrialClassSchedule(
  input: TrialClassScheduleCreateInput,
) {
  return prisma.$transaction(async (tx) => {
    assertStartBeforeEnd(input.startTime, input.endTime);
    return tx.trialClassSchedule.create({
      data: {
        code: input.code,
        name: input.name,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        active: input.active,
      },
    });
  });
}

export async function listTrialClassSchedules(
  filters: TrialClassScheduleListFilters = {},
) {
  return prisma.trialClassSchedule.findMany({
    where: {
      ...(filters.active !== undefined ? { active: filters.active } : {}),
      ...(filters.dayOfWeek !== undefined
        ? { dayOfWeek: filters.dayOfWeek }
        : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function getTrialClassScheduleById(id: string) {
  const row = await prisma.trialClassSchedule.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Trial class schedule not found", 404);
  }
  return row;
}

export async function updateTrialClassSchedule(
  id: string,
  input: TrialClassScheduleUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassSchedule.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class schedule not found", 404);
    }

    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;
    assertStartBeforeEnd(startTime, endTime);

    return tx.trialClassSchedule.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
        active: input.active,
      },
    });
  });
}

export async function setTrialClassScheduleActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassSchedule.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class schedule not found", 404);
    }
    return tx.trialClassSchedule.update({
      where: { id },
      data: { active },
    });
  });
}
