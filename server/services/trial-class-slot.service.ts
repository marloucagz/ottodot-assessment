import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type TrialClassSlotCreateInput = {
  scheduleId?: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone?: string;
  capacity: number;
  active?: boolean;
};

export type TrialClassSlotUpdateInput = {
  scheduleId?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  timezone?: string;
  capacity?: number;
  active?: boolean;
};

export type TrialClassSlotListFilters = {
  scheduleId?: string;
  active?: boolean;
};

export type TrialClassSlotCancelInput = {
  reason?: string;
};

function assertStartsBeforeEnds(startsAt: Date, endsAt: Date) {
  if (startsAt >= endsAt) {
    throw new AppError(
      "VALIDATION_ERROR",
      "startsAt must be before endsAt",
      400,
    );
  }
}

export async function createTrialClassSlot(input: TrialClassSlotCreateInput) {
  return prisma.$transaction(async (tx) => {
    assertStartsBeforeEnds(input.startsAt, input.endsAt);

    if (input.scheduleId) {
      const schedule = await tx.trialClassSchedule.findUnique({
        where: { id: input.scheduleId },
      });
      if (!schedule) {
        throw new AppError("NOT_FOUND", "Trial class schedule not found", 404);
      }
    }

    return tx.trialClassSlot.create({
      data: {
        scheduleId: input.scheduleId ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        capacity: input.capacity,
        available: input.capacity,
        active: input.active,
      },
    });
  });
}

export async function listTrialClassSlots(
  filters: TrialClassSlotListFilters = {},
) {
  return prisma.trialClassSlot.findMany({
    where: {
      ...(filters.scheduleId ? { scheduleId: filters.scheduleId } : {}),
      ...(filters.active !== undefined ? { active: filters.active } : {}),
    },
    orderBy: [{ startsAt: "asc" }],
  });
}

export async function getTrialClassSlotById(id: string) {
  const row = await prisma.trialClassSlot.findUnique({ where: { id } });
  if (!row) {
    throw new AppError("NOT_FOUND", "Trial class slot not found", 404);
  }
  return row;
}

export async function updateTrialClassSlot(
  id: string,
  input: TrialClassSlotUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassSlot.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class slot not found", 404);
    }

    const startsAt = input.startsAt ?? existing.startsAt;
    const endsAt = input.endsAt ?? existing.endsAt;
    assertStartsBeforeEnds(startsAt, endsAt);

    if (input.scheduleId) {
      const schedule = await tx.trialClassSchedule.findUnique({
        where: { id: input.scheduleId },
      });
      if (!schedule) {
        throw new AppError("NOT_FOUND", "Trial class schedule not found", 404);
      }
    }

    const data: {
      scheduleId?: string | null;
      startsAt?: Date;
      endsAt?: Date;
      timezone?: string;
      capacity?: number;
      available?: number;
      active?: boolean;
    } = {
      ...(input.scheduleId !== undefined
        ? { scheduleId: input.scheduleId }
        : {}),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      active: input.active,
    };

    if (input.capacity !== undefined && input.capacity !== existing.capacity) {
      const consumed = existing.capacity - existing.available;
      if (input.capacity < consumed) {
        throw new AppError(
          "CAPACITY_CONFLICT",
          "Cannot reduce capacity below consumed seats",
          409,
        );
      }
      data.capacity = input.capacity;
      if (input.capacity > existing.capacity) {
        data.available =
          existing.available + (input.capacity - existing.capacity);
      } else {
        data.available = input.capacity - consumed;
      }
    }

    return tx.trialClassSlot.update({
      where: { id },
      data,
    });
  });
}

export async function setTrialClassSlotActive(id: string, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassSlot.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class slot not found", 404);
    }
    return tx.trialClassSlot.update({
      where: { id },
      data: { active },
    });
  });
}

export async function cancelTrialClassSlot(
  id: string,
  input: TrialClassSlotCancelInput = {},
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.trialClassSlot.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Trial class slot not found", 404);
    }
    return tx.trialClassSlot.update({
      where: { id },
      data: {
        cancelledAt: new Date(),
        active: false,
        cancellationReason: input.reason ?? null,
      },
    });
  });
}
