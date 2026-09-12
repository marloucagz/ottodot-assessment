import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

async function main() {
  const connectionString =
    process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const learningMethod = await prisma.learningMethod.upsert({
    where: { code: "SG" },
    update: { name: "Singapore Learning Method", active: true },
    create: {
      code: "SG",
      name: "Singapore Learning Method",
      description: "Singapore curriculum trial classes",
      sortOrder: 1,
    },
  });

  const level = await prisma.level.upsert({
    where: {
      learningMethodId_code: {
        learningMethodId: learningMethod.id,
        code: "PRIMARY",
      },
    },
    update: { name: "Primary", active: true },
    create: {
      learningMethodId: learningMethod.id,
      code: "PRIMARY",
      name: "Primary",
      sortOrder: 1,
    },
  });

  const grades = [];
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const grade = await prisma.grade.upsert({
      where: {
        levelId_code: { levelId: level.id, code: `G${n}` },
      },
      update: { name: `Grade ${n}`, active: true },
      create: {
        levelId: level.id,
        code: `G${n}`,
        name: `Grade ${n}`,
        sortOrder: n,
      },
    });
    grades.push(grade);
  }

  const math = await prisma.subject.upsert({
    where: { code: "MATH" },
    update: { name: "Math", active: true },
    create: { code: "MATH", name: "Math", sortOrder: 1 },
  });
  const science = await prisma.subject.upsert({
    where: { code: "SCIENCE" },
    update: { name: "Science", active: true },
    create: { code: "SCIENCE", name: "Science", sortOrder: 2 },
  });

  for (const subject of [math, science]) {
    await prisma.levelSubject.upsert({
      where: {
        levelId_subjectId: { levelId: level.id, subjectId: subject.id },
      },
      update: { active: true },
      create: { levelId: level.id, subjectId: subject.id },
    });
  }

  await prisma.capability.upsert({
    where: { subjectId_code: { subjectId: math.id, code: "PROBLEM_SOLVING" } },
    update: { name: "Problem Solving", active: true },
    create: {
      subjectId: math.id,
      code: "PROBLEM_SOLVING",
      name: "Problem Solving",
    },
  });
  await prisma.capability.upsert({
    where: { subjectId_code: { subjectId: science.id, code: "INQUIRY" } },
    update: { name: "Scientific Inquiry", active: true },
    create: {
      subjectId: science.id,
      code: "INQUIRY",
      name: "Scientific Inquiry",
    },
  });

  for (const grade of grades) {
    for (const subject of [math, science]) {
      const amount = subject.code === "MATH" ? "50.00" : "55.00";
      await prisma.trialClassPrice.upsert({
        where: {
          levelId_gradeId_subjectId: {
            levelId: level.id,
            gradeId: grade.id,
            subjectId: subject.id,
          },
        },
        update: { amount, currency: "USD", active: true },
        create: {
          levelId: level.id,
          gradeId: grade.id,
          subjectId: subject.id,
          amount,
          currency: "USD",
        },
      });
    }
  }

  const schedule = await prisma.trialClassSchedule.upsert({
    where: { code: "SAT-1000" },
    update: {
      name: "Saturday 10:00–11:00",
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "11:00",
      timezone: "Asia/Singapore",
      active: true,
    },
    create: {
      code: "SAT-1000",
      name: "Saturday 10:00–11:00",
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "11:00",
      timezone: "Asia/Singapore",
    },
  });

  console.log(
    JSON.stringify(
      {
        learningMethodId: learningMethod.id,
        levelId: level.id,
        gradeIds: grades.map((g) => g.id),
        subjectIds: { math: math.id, science: science.id },
        scheduleId: schedule.id,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
