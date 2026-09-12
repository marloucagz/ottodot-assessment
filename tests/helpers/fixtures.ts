import { createPrisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export function getTestPrisma(): PrismaClient {
  const connectionString =
    process.env.TEST_DATABASE_URL ??
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL required for tests");
  }
  return createPrisma({ connectionString });
}

export async function seedBookingFixture(prisma: PrismaClient) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const userA = await prisma.user.create({
    data: {
      email: `user-a-${suffix}@test.local`,
      firstName: "User",
      lastName: "A",
    },
  });
  const userB = await prisma.user.create({
    data: {
      email: `user-b-${suffix}@test.local`,
      firstName: "User",
      lastName: "B",
    },
  });

  const studentA1 = await prisma.student.create({
    data: { parentId: userA.id, firstName: "ChildA1" },
  });
  const studentA2 = await prisma.student.create({
    data: { parentId: userA.id, firstName: "ChildA2" },
  });
  const studentB1 = await prisma.student.create({
    data: { parentId: userB.id, firstName: "ChildB1" },
  });
  const studentB2 = await prisma.student.create({
    data: { parentId: userB.id, firstName: "ChildB2" },
  });

  const learningMethod = await prisma.learningMethod.create({
    data: {
      code: `SG-${suffix}`,
      name: "Singapore Learning Method",
    },
  });
  const level = await prisma.level.create({
    data: {
      learningMethodId: learningMethod.id,
      code: "PRIMARY",
      name: "Primary",
    },
  });
  const grade = await prisma.grade.create({
    data: {
      levelId: level.id,
      code: "G3",
      name: "Grade 3",
    },
  });
  const otherGrade = await prisma.grade.create({
    data: {
      levelId: level.id,
      code: "G4",
      name: "Grade 4",
    },
  });

  const math = await prisma.subject.create({
    data: { code: `MATH-${suffix}`, name: "Math" },
  });
  const science = await prisma.subject.create({
    data: { code: `SCI-${suffix}`, name: "Science" },
  });
  const orphanSubject = await prisma.subject.create({
    data: { code: `HIST-${suffix}`, name: "History" },
  });

  await prisma.levelSubject.create({
    data: { levelId: level.id, subjectId: math.id },
  });
  await prisma.levelSubject.create({
    data: { levelId: level.id, subjectId: science.id },
  });

  await prisma.trialClassPrice.create({
    data: {
      levelId: level.id,
      gradeId: grade.id,
      subjectId: math.id,
      amount: "50.00",
      currency: "USD",
    },
  });
  await prisma.trialClassPrice.create({
    data: {
      levelId: level.id,
      gradeId: grade.id,
      subjectId: science.id,
      amount: "55.00",
      currency: "USD",
    },
  });

  const capability = await prisma.capability.create({
    data: {
      subjectId: math.id,
      code: `PS-${suffix}`,
      name: "Problem Solving",
    },
  });

  const schedule = await prisma.trialClassSchedule.create({
    data: {
      code: `SCH-${suffix}`,
      name: "Saturday morning",
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "11:00",
      timezone: "Asia/Singapore",
    },
  });

  return {
    suffix,
    userA,
    userB,
    studentA1,
    studentA2,
    studentB1,
    studentB2,
    learningMethod,
    level,
    grade,
    otherGrade,
    math,
    science,
    orphanSubject,
    capability,
    schedule,
  };
}

export async function createSlot(
  prisma: PrismaClient,
  scheduleId: string,
  opts: { capacity: number; available?: number; startsInMs?: number; cancelled?: boolean },
) {
  const startsAt = new Date(Date.now() + (opts.startsInMs ?? 60 * 60 * 1000));
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  return prisma.trialClassSlot.create({
    data: {
      scheduleId,
      startsAt,
      endsAt,
      timezone: "Asia/Singapore",
      capacity: opts.capacity,
      available: opts.available ?? opts.capacity,
      active: true,
      cancelledAt: opts.cancelled ? new Date() : null,
      cancellationReason: opts.cancelled ? "test" : null,
    },
  });
}

export function studentPayload(
  fixture: Awaited<ReturnType<typeof seedBookingFixture>>,
  studentId: string,
  overrides: Partial<{
    gradeId: string;
    subjectIds: string[];
    capabilityIds: string[];
  }> = {},
) {
  return {
    studentId,
    learningMethodId: fixture.learningMethod.id,
    levelId: fixture.level.id,
    gradeId: overrides.gradeId ?? fixture.grade.id,
    subjectIds: overrides.subjectIds ?? [fixture.math.id, fixture.science.id],
    capabilityIds: overrides.capabilityIds ?? [],
  };
}
