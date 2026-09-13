import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { CURRENCY_USD } from "@/lib/constants";
import type { DbClient } from "@/lib/db";

export const DEMO_SEED_VERSION = "v4";
export const DEMO_SEED_STATE_ID = "default";

/** Postgres advisory lock keys for seed/reset (prevents concurrent wipe+insert races). */
const DEMO_SEED_LOCK_K1 = 7740;
const DEMO_SEED_LOCK_K2 = 1517;

const DEMO_PARENT_A_EMAIL = "demo-parent-a@seed.local";
const DEMO_PARENT_B_EMAIL = "demo-parent-b@seed.local";

/** Remote Supabase round-trips are slow; keep headroom above createMany duration. */
const SEED_TX = { maxWait: 20_000, timeout: 120_000 } as const;

export type DemoStudentSummary = {
  id: string;
  firstName: string;
  lastName: string | null;
};

export type DemoParentSummary = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  studentIds: string[];
  students: DemoStudentSummary[];
};

export type DemoSeedSummary = {
  learningMethodId: string;
  levelId: string;
  gradeId: string;
  subjectIds: { math: string; science: string };
  scheduleId: string;
  slots: {
    lastSeat: { id: string; capacity: number };
    multiChild: { id: string; capacity: number };
    happyPath: { id: string; capacity: number };
    expiration: { id: string; capacity: number };
  };
  users: {
    parentA: DemoParentSummary;
    parentB: DemoParentSummary;
  };
};

export type DemoSeedStatus = {
  seeded: boolean;
  seededAt: string | null;
  version: string | null;
  summary: DemoSeedSummary | null;
};

async function ensureSeedState(tx: DbClient) {
  return tx.demoSeedState.upsert({
    where: { id: DEMO_SEED_STATE_ID },
    create: { id: DEMO_SEED_STATE_ID, seeded: false },
    update: {},
  });
}

async function acquireSeedLock(tx: DbClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DEMO_SEED_LOCK_K1}, ${DEMO_SEED_LOCK_K2})`;
}

async function wipeDemoData(tx: DbClient) {
  await tx.studentCapabilitySelection.deleteMany({});
  await tx.studentBookingSubject.deleteMany({});
  await tx.studentBooking.deleteMany({});
  await tx.payment.deleteMany({});
  await tx.slotReservation.deleteMany({});
  await tx.booking.deleteMany({});
  await tx.trialClassSlot.deleteMany({});
  await tx.trialClassSchedule.deleteMany({});
  await tx.trialClassPrice.deleteMany({});
  await tx.capability.deleteMany({});
  await tx.levelSubject.deleteMany({});
  await tx.grade.deleteMany({});
  await tx.level.deleteMany({});
  await tx.subject.deleteMany({});
  await tx.learningMethod.deleteMany({});
  await tx.student.deleteMany({});
  await tx.user.deleteMany({});
}

async function insertDemoDataset(tx: DbClient): Promise<DemoSeedSummary> {
  const learningMethod = await tx.learningMethod.create({
    data: {
      code: "SG",
      name: "Singapore Curriculum",
      description: "Singapore curriculum trial classes",
      sortOrder: 1,
    },
  });

  const level = await tx.level.create({
    data: {
      learningMethodId: learningMethod.id,
      code: "PRIMARY",
      name: "Primary",
      sortOrder: 1,
    },
  });

  await tx.grade.createMany({
    data: [1, 2, 3, 4, 5, 6].map((n) => ({
      levelId: level.id,
      code: `G${n}`,
      name: `Grade ${n}`,
      sortOrder: n,
    })),
  });
  const grades = await tx.grade.findMany({
    where: { levelId: level.id },
    orderBy: { sortOrder: "asc" },
  });
  const grade3 = grades[2]!;

  await tx.subject.createMany({
    data: [
      { code: "MATH", name: "Math", sortOrder: 1 },
      { code: "SCIENCE", name: "Science", sortOrder: 2 },
    ],
  });
  const math = await tx.subject.findUniqueOrThrow({ where: { code: "MATH" } });
  const science = await tx.subject.findUniqueOrThrow({
    where: { code: "SCIENCE" },
  });

  await tx.levelSubject.createMany({
    data: [
      { levelId: level.id, subjectId: math.id },
      { levelId: level.id, subjectId: science.id },
    ],
  });

  await tx.capability.createMany({
    data: [
      {
        subjectId: math.id,
        code: "PROBLEM_SOLVING",
        name: "Problem Solving",
        sortOrder: 1,
      },
      {
        subjectId: science.id,
        code: "INQUIRY",
        name: "Scientific Inquiry",
        sortOrder: 2,
      },
      {
        code: "PREF_COMPUTER_ALL",
        name: "My child can do everything independently",
        description: "computer",
        sortOrder: 10,
      },
      {
        code: "PREF_COMPUTER_MOST",
        name: "My child can do most things independently",
        description: "computer",
        sortOrder: 11,
      },
      {
        code: "PREF_COMPUTER_SOME",
        name: "My child may need some help",
        description: "computer",
        sortOrder: 12,
      },
      {
        code: "PREF_COMPUTER_ADULT",
        name: "My child needs an adult nearby",
        description: "computer",
        sortOrder: 13,
      },
      {
        code: "PREF_PARENT_YES",
        name: "Yes, I can stay nearby",
        description: "parent",
        sortOrder: 20,
      },
      {
        code: "PREF_PARENT_CHECKIN",
        name: "I can check in if needed",
        description: "parent",
        sortOrder: 21,
      },
      {
        code: "PREF_PARENT_UNAVAILABLE",
        name: "I may not be available",
        description: "parent",
        sortOrder: 22,
      },
      {
        code: "PREF_DEVICE_LAPTOP",
        name: "Laptop",
        description: "device",
        sortOrder: 30,
      },
      {
        code: "PREF_DEVICE_DESKTOP",
        name: "Desktop computer",
        description: "device",
        sortOrder: 31,
      },
      {
        code: "PREF_DEVICE_TABLET",
        name: "Tablet",
        description: "device",
        sortOrder: 32,
      },
      {
        code: "PREF_DEVICE_PHONE",
        name: "Smartphone",
        description: "device",
        sortOrder: 33,
      },
      {
        code: "PREF_SECOND_YES",
        name: "Yes",
        description: "second",
        sortOrder: 40,
      },
      {
        code: "PREF_SECOND_NO",
        name: "No",
        description: "second",
        sortOrder: 41,
      },
      {
        code: "PREF_SECOND_UNSURE",
        name: "Not sure",
        description: "second",
        sortOrder: 42,
      },
    ],
  });

  await tx.trialClassPrice.createMany({
    data: grades.flatMap((grade) =>
      [math, science].map((subject) => ({
        levelId: level.id,
        gradeId: grade.id,
        subjectId: subject.id,
        amount: subject.code === "MATH" ? "50.00" : "55.00",
        currency: CURRENCY_USD,
      })),
    ),
  });

  const schedule = await tx.trialClassSchedule.create({
    data: {
      code: "SAT-1000",
      name: "Saturday 10:00–11:00",
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "11:00",
      timezone: "Asia/Singapore",
    },
  });

  const baseStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  baseStart.setUTCMinutes(0, 0, 0);

  const slotSpecs = [
    { capacity: 1, dayOffset: 0 },
    { capacity: 2, dayOffset: 1 },
    { capacity: 4, dayOffset: 2 },
    { capacity: 1, dayOffset: 3 },
  ] as const;

  await tx.trialClassSlot.createMany({
    data: slotSpecs.map(({ capacity, dayOffset }) => {
      const startsAt = new Date(
        baseStart.getTime() + dayOffset * 24 * 60 * 60 * 1000,
      );
      return {
        scheduleId: schedule.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        timezone: "Asia/Singapore",
        capacity,
        available: capacity,
        active: true,
      };
    }),
  });

  const slots = await tx.trialClassSlot.findMany({
    where: { scheduleId: schedule.id },
    orderBy: { startsAt: "asc" },
  });
  const lastSeat = slots[0]!;
  const multiChild = slots[1]!;
  const happyPath = slots[2]!;
  const expiration = slots[3]!;

  const parentA = await tx.user.create({
    data: {
      email: DEMO_PARENT_A_EMAIL,
      firstName: "Demo",
      lastName: "Parent A",
      students: {
        create: [
          { firstName: "Alex", lastName: "A" },
          { firstName: "Avery", lastName: "A" },
        ],
      },
    },
    include: { students: { orderBy: { firstName: "asc" } } },
  });
  const parentB = await tx.user.create({
    data: {
      email: DEMO_PARENT_B_EMAIL,
      firstName: "Demo",
      lastName: "Parent B",
      students: {
        create: [
          { firstName: "Blake", lastName: "B" },
          { firstName: "Blair", lastName: "B" },
        ],
      },
    },
    include: { students: { orderBy: { firstName: "asc" } } },
  });

  const toParent = (
    user: typeof parentA,
  ): DemoParentSummary => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    studentIds: user.students.map((s) => s.id),
    students: user.students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
    })),
  });

  return {
    learningMethodId: learningMethod.id,
    levelId: level.id,
    gradeId: grade3.id,
    subjectIds: { math: math.id, science: science.id },
    scheduleId: schedule.id,
    slots: {
      lastSeat: { id: lastSeat.id, capacity: lastSeat.capacity },
      multiChild: { id: multiChild.id, capacity: multiChild.capacity },
      happyPath: { id: happyPath.id, capacity: happyPath.capacity },
      expiration: { id: expiration.id, capacity: expiration.capacity },
    },
    users: {
      parentA: toParent(parentA),
      parentB: toParent(parentB),
    },
  };
}

async function buildSummaryFromDb(): Promise<DemoSeedSummary | null> {
  const parentA = await prisma.user.findUnique({
    where: { email: DEMO_PARENT_A_EMAIL },
    include: { students: { orderBy: { firstName: "asc" } } },
  });
  const parentB = await prisma.user.findUnique({
    where: { email: DEMO_PARENT_B_EMAIL },
    include: { students: { orderBy: { firstName: "asc" } } },
  });
  if (!parentA || !parentB) return null;

  const learningMethod = await prisma.learningMethod.findUnique({
    where: { code: "SG" },
  });
  if (!learningMethod) return null;

  const level = await prisma.level.findUnique({
    where: {
      learningMethodId_code: {
        learningMethodId: learningMethod.id,
        code: "PRIMARY",
      },
    },
  });
  if (!level) return null;

  const grade = await prisma.grade.findUnique({
    where: { levelId_code: { levelId: level.id, code: "G3" } },
  });
  const math = await prisma.subject.findUnique({ where: { code: "MATH" } });
  const science = await prisma.subject.findUnique({
    where: { code: "SCIENCE" },
  });
  const schedule = await prisma.trialClassSchedule.findUnique({
    where: { code: "SAT-1000" },
  });
  if (!grade || !math || !science || !schedule) return null;

  const slots = await prisma.trialClassSlot.findMany({
    where: { scheduleId: schedule.id, active: true, cancelledAt: null },
    orderBy: { startsAt: "asc" },
  });
  if (slots.length < 4) return null;
  const lastSeat = slots[0]!;
  const multiChild = slots[1]!;
  const happyPath = slots[2]!;
  const expiration = slots[3]!;
  if (
    lastSeat.capacity !== 1 ||
    multiChild.capacity !== 2 ||
    happyPath.capacity !== 4 ||
    expiration.capacity !== 1
  ) {
    return null;
  }

  const toParent = (user: typeof parentA): DemoParentSummary => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    studentIds: user.students.map((s) => s.id),
    students: user.students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
    })),
  });

  return {
    learningMethodId: learningMethod.id,
    levelId: level.id,
    gradeId: grade.id,
    subjectIds: { math: math.id, science: science.id },
    scheduleId: schedule.id,
    slots: {
      lastSeat: { id: lastSeat.id, capacity: lastSeat.capacity },
      multiChild: { id: multiChild.id, capacity: multiChild.capacity },
      happyPath: { id: happyPath.id, capacity: happyPath.capacity },
      expiration: { id: expiration.id, capacity: expiration.capacity },
    },
    users: {
      parentA: toParent(parentA),
      parentB: toParent(parentB),
    },
  };
}

export async function getSeedStatus(): Promise<DemoSeedStatus> {
  const state = await prisma.$transaction(async (tx) => ensureSeedState(tx));
  const summary = state.seeded ? await buildSummaryFromDb() : null;
  return {
    seeded: state.seeded,
    seededAt: state.seededAt?.toISOString() ?? null,
    version: state.version,
    summary,
  };
}

export async function seedDemo(): Promise<DemoSeedStatus> {
  return prisma.$transaction(async (tx) => {
    await acquireSeedLock(tx);
    const state = await ensureSeedState(tx);
    if (state.seeded) {
      throw new AppError(
        "ALREADY_SEEDED",
        "Demo data is already seeded. Use reset instead.",
        409,
      );
    }

    // Clear any leftover rows (e.g. prior CLI partial seed) before first seed.
    await wipeDemoData(tx);
    const summary = await insertDemoDataset(tx);
    const now = new Date();
    await tx.demoSeedState.update({
      where: { id: DEMO_SEED_STATE_ID },
      data: {
        seeded: true,
        seededAt: now,
        version: DEMO_SEED_VERSION,
      },
    });

    return {
      seeded: true,
      seededAt: now.toISOString(),
      version: DEMO_SEED_VERSION,
      summary,
    } satisfies DemoSeedStatus;
  }, SEED_TX);
}

export async function resetDemo(): Promise<DemoSeedStatus> {
  return prisma.$transaction(async (tx) => {
    await acquireSeedLock(tx);
    const state = await ensureSeedState(tx);
    if (!state.seeded) {
      throw new AppError(
        "NOT_SEEDED",
        "Demo data is not seeded. Use seed instead.",
        409,
      );
    }

    await wipeDemoData(tx);
    const summary = await insertDemoDataset(tx);
    const now = new Date();
    await tx.demoSeedState.update({
      where: { id: DEMO_SEED_STATE_ID },
      data: {
        seeded: true,
        seededAt: now,
        version: DEMO_SEED_VERSION,
      },
    });

    return {
      seeded: true,
      seededAt: now.toISOString(),
      version: DEMO_SEED_VERSION,
      summary,
    } satisfies DemoSeedStatus;
  }, SEED_TX);
}

/** CLI helper: seed if empty, otherwise no-op. */
export async function seedDemoCli(): Promise<DemoSeedStatus> {
  const status = await getSeedStatus();
  if (status.seeded) {
    console.log("Demo already seeded; no-op. Use /trial-booking/seed Reset to wipe+reseed.");
    return status;
  }
  return seedDemo();
}
