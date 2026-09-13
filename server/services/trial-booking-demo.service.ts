import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { DbClient } from "@/lib/db";
import {
  createBooking,
  type CreateBookingInput,
} from "@/server/services/booking.service";
import {
  getSeedStatus,
  type DemoSeedSummary,
} from "@/server/services/demo-seed.service";
import { getTrialClassSlotById } from "@/server/services/trial-class-slot.service";

export const DEMO_SCENARIOS = [
  "normal",
  "last-seat-race",
  "high-concurrency",
  "multi-child-race",
  "duplicate-submission",
  "stale-availability",
  "reservation-expiration",
  "payment-after-expiration",
  "payment-vs-expiration",
  "cancellation-race",
  "slot-cancellation",
  "invalid-configuration",
  "invalid-relationship",
  "child-ownership",
  "roster",
] as const;

export type DemoScenarioId = (typeof DEMO_SCENARIOS)[number];

const STRESS_EMAIL_PREFIX = "demo-stress-";

async function requireSeedSummary(): Promise<DemoSeedSummary> {
  const status = await getSeedStatus();
  if (!status.seeded || !status.summary) {
    throw new AppError(
      "NOT_SEEDED",
      "Demo data is not seeded. Visit /trial-booking/seed and click Seed first.",
      409,
    );
  }
  return status.summary;
}

export async function getTrialBookingDemoContext() {
  const summary = await requireSeedSummary();
  const slotIds = [
    summary.slots.lastSeat.id,
    summary.slots.multiChild.id,
    summary.slots.happyPath.id,
    summary.slots.expiration.id,
  ];

  const slots = await prisma.trialClassSlot.findMany({
    where: { id: { in: slotIds } },
    orderBy: { startsAt: "asc" },
  });

  const learningMethod = await prisma.learningMethod.findUniqueOrThrow({
    where: { id: summary.learningMethodId },
  });
  const level = await prisma.level.findUniqueOrThrow({
    where: { id: summary.levelId },
  });
  const grade = await prisma.grade.findUniqueOrThrow({
    where: { id: summary.gradeId },
  });
  const math = await prisma.subject.findUniqueOrThrow({
    where: { id: summary.subjectIds.math },
  });
  const science = await prisma.subject.findUniqueOrThrow({
    where: { id: summary.subjectIds.science },
  });

  const grades = await prisma.grade.findMany({
    where: { levelId: level.id },
    orderBy: { sortOrder: "asc" },
  });
  const levelSubjects = await prisma.levelSubject.findMany({
    where: { levelId: level.id, active: true },
    include: { subject: true },
  });
  const capabilities = await prisma.capability.findMany({
    where: {
      active: true,
      OR: [{ subjectId: { in: [math.id, science.id] } }, { subjectId: null }],
    },
    orderBy: { sortOrder: "asc" },
  });

  const capabilitiesBySubject: Record<
    string,
    Array<{ id: string; code: string; name: string; subjectId: string | null }>
  > = {};
  const preferenceCapabilities: Array<{
    id: string;
    code: string;
    name: string;
    subjectId: string | null;
  }> = [];
  for (const cap of capabilities) {
    if (!cap.subjectId) {
      preferenceCapabilities.push({
        id: cap.id,
        code: cap.code,
        name: cap.name,
        subjectId: null,
      });
      continue;
    }
    if (!capabilitiesBySubject[cap.subjectId]) {
      capabilitiesBySubject[cap.subjectId] = [];
    }
    capabilitiesBySubject[cap.subjectId]!.push({
      id: cap.id,
      code: cap.code,
      name: cap.name,
      subjectId: cap.subjectId,
    });
  }

  return {
    seeded: true,
    catalog: {
      learningMethod: {
        id: learningMethod.id,
        code: learningMethod.code,
        name: learningMethod.name,
        active: learningMethod.active,
      },
      level: {
        id: level.id,
        code: level.code,
        name: level.name,
        active: level.active,
      },
      grade: {
        id: grade.id,
        code: grade.code,
        name: grade.name,
        active: grade.active,
      },
      grades: grades.map((g) => ({
        id: g.id,
        code: g.code,
        name: g.name,
        levelId: g.levelId,
        active: g.active,
      })),
      subjects: {
        math: {
          id: math.id,
          code: math.code,
          name: math.name,
          active: math.active,
        },
        science: {
          id: science.id,
          code: science.code,
          name: science.name,
          active: science.active,
        },
      },
      levelSubjectIds: levelSubjects.map((ls) => ls.subjectId),
      subjectList: levelSubjects.map((ls) => ({
        id: ls.subject.id,
        code: ls.subject.code,
        name: ls.subject.name,
        active: ls.subject.active,
      })),
      capabilitiesBySubject,
      preferenceCapabilities,
    },
    slots: {
      lastSeat: slotView(slots, summary.slots.lastSeat.id, "Last seat"),
      multiChild: slotView(slots, summary.slots.multiChild.id, "Multi-child"),
      happyPath: slotView(slots, summary.slots.happyPath.id, "Happy path"),
      expiration: slotView(slots, summary.slots.expiration.id, "Expiration"),
    },
    users: {
      parentA: summary.users.parentA,
      parentB: summary.users.parentB,
    },
    scenarios: DEMO_SCENARIOS,
  };
}

function slotView(
  slots: Array<{
    id: string;
    capacity: number;
    available: number;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    active: boolean;
    cancelledAt: Date | null;
  }>,
  id: string,
  label: string,
) {
  const slot = slots.find((s) => s.id === id);
  if (!slot) {
    return {
      id,
      label,
      capacity: 0,
      available: 0,
      startsAt: null,
      endsAt: null,
      timezone: "Asia/Singapore",
      active: false,
      cancelledAt: null,
    };
  }
  return {
    id: slot.id,
    label,
    capacity: slot.capacity,
    available: slot.available,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    timezone: slot.timezone,
    active: slot.active,
    cancelledAt: slot.cancelledAt?.toISOString() ?? null,
  };
}

async function clearSlotBookings(tx: DbClient, slotId: string) {
  const reservations = await tx.slotReservation.findMany({
    where: { slotId },
    select: { bookingId: true },
  });
  const bookingIds = reservations.map((r) => r.bookingId);
  if (bookingIds.length === 0) return;

  await tx.studentCapabilitySelection.deleteMany({
    where: { studentBooking: { bookingId: { in: bookingIds } } },
  });
  await tx.studentBookingSubject.deleteMany({
    where: { studentBooking: { bookingId: { in: bookingIds } } },
  });
  await tx.studentBooking.deleteMany({
    where: { bookingId: { in: bookingIds } },
  });
  await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await tx.slotReservation.deleteMany({ where: { slotId } });
  await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
}

async function restoreSlot(
  tx: DbClient,
  slotId: string,
  capacity: number,
) {
  await clearSlotBookings(tx, slotId);
  await tx.trialClassSlot.update({
    where: { id: slotId },
    data: {
      capacity,
      available: capacity,
      active: true,
      cancelledAt: null,
      cancellationReason: null,
    },
  });
}

async function deleteStressUsers(tx: DbClient) {
  const users = await tx.user.findMany({
    where: { email: { startsWith: STRESS_EMAIL_PREFIX } },
    select: { id: true },
  });
  if (users.length === 0) return;
  const userIds = users.map((u) => u.id);

  const bookings = await tx.booking.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const bookingIds = bookings.map((b) => b.id);
  if (bookingIds.length > 0) {
    await tx.studentCapabilitySelection.deleteMany({
      where: { studentBooking: { bookingId: { in: bookingIds } } },
    });
    await tx.studentBookingSubject.deleteMany({
      where: { studentBooking: { bookingId: { in: bookingIds } } },
    });
    await tx.studentBooking.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await tx.slotReservation.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
  }

  await tx.student.deleteMany({ where: { parentId: { in: userIds } } });
  await tx.user.deleteMany({ where: { id: { in: userIds } } });
}

export async function resetDemoScenario(scenarioId: string) {
  if (!DEMO_SCENARIOS.includes(scenarioId as DemoScenarioId)) {
    throw new AppError("VALIDATION_ERROR", `Unknown scenario: ${scenarioId}`, 400);
  }

  const summary = await requireSeedSummary();

  await prisma.$transaction(
    async (tx) => {
      await deleteStressUsers(tx);

      // Always restore catalog activeness used by invalid-configuration demos.
      await tx.learningMethod.update({
        where: { id: summary.learningMethodId },
        data: { active: true },
      });
      await tx.level.update({
        where: { id: summary.levelId },
        data: { active: true },
      });
      await tx.grade.update({
        where: { id: summary.gradeId },
        data: { active: true },
      });
      await tx.subject.update({
        where: { id: summary.subjectIds.math },
        data: { active: true },
      });
      await tx.subject.update({
        where: { id: summary.subjectIds.science },
        data: { active: true },
      });

      switch (scenarioId as DemoScenarioId) {
        case "normal":
        case "duplicate-submission":
        case "roster":
          await restoreSlot(tx, summary.slots.happyPath.id, 4);
          break;
        case "last-seat-race":
        case "stale-availability":
        case "cancellation-race":
        case "slot-cancellation":
        case "invalid-configuration":
        case "invalid-relationship":
        case "child-ownership":
          await restoreSlot(tx, summary.slots.lastSeat.id, 1);
          break;
        case "high-concurrency":
          await restoreSlot(tx, summary.slots.happyPath.id, 4);
          break;
        case "multi-child-race":
          await restoreSlot(tx, summary.slots.multiChild.id, 2);
          // Spec wants capacity 3 for multi-child race demo — bump for this scenario.
          await tx.trialClassSlot.update({
            where: { id: summary.slots.multiChild.id },
            data: { capacity: 3, available: 3 },
          });
          break;
        case "reservation-expiration":
        case "payment-after-expiration":
        case "payment-vs-expiration":
          await restoreSlot(tx, summary.slots.expiration.id, 1);
          break;
        default:
          break;
      }
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  const slotId = primarySlotForScenario(scenarioId as DemoScenarioId, summary);
  const slot = await getTrialClassSlotById(slotId);
  return {
    scenarioId,
    slot: {
      id: slot.id,
      capacity: slot.capacity,
      available: slot.available,
      active: slot.active,
      cancelledAt: slot.cancelledAt?.toISOString() ?? null,
    },
  };
}

function primarySlotForScenario(
  scenarioId: DemoScenarioId,
  summary: DemoSeedSummary,
): string {
  switch (scenarioId) {
    case "normal":
    case "duplicate-submission":
    case "roster":
    case "high-concurrency":
      return summary.slots.happyPath.id;
    case "multi-child-race":
      return summary.slots.multiChild.id;
    case "reservation-expiration":
    case "payment-after-expiration":
    case "payment-vs-expiration":
      return summary.slots.expiration.id;
    default:
      return summary.slots.lastSeat.id;
  }
}

export async function prepareConcurrencyActors(input: {
  count: number;
  childrenPerUser?: number;
}) {
  const count = Math.min(Math.max(Math.floor(input.count), 1), 50);
  const childrenPerUser = Math.min(
    Math.max(Math.floor(input.childrenPerUser ?? 1), 1),
    3,
  );
  const summary = await requireSeedSummary();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const actors = await prisma.$transaction(
    async (tx) => {
      await deleteStressUsers(tx);
      const created = [];
      for (let i = 0; i < count; i += 1) {
        const n = String(i + 1).padStart(2, "0");
        const user = await tx.user.create({
          data: {
            email: `${STRESS_EMAIL_PREFIX}${suffix}-${n}@seed.local`,
            firstName: "Stress",
            lastName: `User ${n}`,
            students: {
              create: Array.from({ length: childrenPerUser }, (_, j) => ({
                firstName: `Child${n}`,
                lastName: `C${j + 1}`,
              })),
            },
          },
          include: { students: { orderBy: { firstName: "asc" } } },
        });
        created.push({
          label: `User ${n}`,
          userId: user.id,
          email: user.email,
          studentIds: user.students.map((s) => s.id),
        });
      }
      return created;
    },
    { maxWait: 20_000, timeout: 120_000 },
  );

  return {
    count: actors.length,
    childrenPerUser,
    catalog: {
      learningMethodId: summary.learningMethodId,
      levelId: summary.levelId,
      gradeId: summary.gradeId,
      subjectIds: [summary.subjectIds.math, summary.subjectIds.science],
      slotId: summary.slots.happyPath.id,
    },
    actors,
  };
}

export async function createDemoBooking(
  input: CreateBookingInput & { ttlSeconds?: number },
) {
  const ttlSeconds =
    typeof input.ttlSeconds === "number" ? input.ttlSeconds : undefined;
  if (ttlSeconds !== undefined) {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 60) {
      throw new AppError(
        "VALIDATION_ERROR",
        "ttlSeconds must be between 1 and 60 for demo bookings",
        400,
      );
    }
  }
  return createBooking({
    ...input,
    ttlSeconds,
  });
}

export function buildStudentPayload(
  summary: DemoSeedSummary,
  studentId: string,
) {
  return {
    studentId,
    learningMethodId: summary.learningMethodId,
    levelId: summary.levelId,
    gradeId: summary.gradeId,
    subjectIds: [summary.subjectIds.math, summary.subjectIds.science],
    capabilityIds: [] as string[],
  };
}

export async function getBookingTerminalState(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { reservation: true, payment: true },
  });
  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }
  return {
    bookingStatus: booking.status,
    reservationStatus: booking.reservation?.status ?? null,
    paymentStatus: booking.payment?.status ?? null,
    expiresAt: booking.reservation?.expiresAt.toISOString() ?? null,
  };
}
