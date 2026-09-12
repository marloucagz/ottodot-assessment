import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  cancelBooking,
  confirmPayment,
  createBooking,
  expireReservations,
} from "@/server/services/booking.service";
import {
  createSlot,
  getTestPrisma,
  seedBookingFixture,
  studentPayload,
} from "../helpers/fixtures";

describe("trial class booking concurrency", () => {
  let prisma: PrismaClient;
  let fixture: Awaited<ReturnType<typeof seedBookingFixture>>;

  beforeAll(async () => {
    prisma = getTestPrisma();
    fixture = await seedBookingFixture(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("TEST 1: last seat race — exactly one success", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });

    const results = await Promise.allSettled([
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentA1.id)],
      }),
      createBooking({
        userId: fixture.userB.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentB1.id)],
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe("SLOT_UNAVAILABLE");

    const updated = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updated.available).toBe(0);

    const reservations = await prisma.slotReservation.findMany({
      where: { slotId: slot.id, status: "ACTIVE" },
    });
    expect(reservations).toHaveLength(1);
  });

  it("TEST 2: quantity=2 race with available=2", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 2 });

    const results = await Promise.allSettled([
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [
          studentPayload(fixture, fixture.studentA1.id),
          studentPayload(fixture, fixture.studentA2.id),
        ],
      }),
      createBooking({
        userId: fixture.userB.id,
        slotId: slot.id,
        students: [
          studentPayload(fixture, fixture.studentB1.id),
          studentPayload(fixture, fixture.studentB2.id),
        ],
      }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const updated = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updated.available).toBe(0);
  });

  it("TEST 3: identical options still serialize on inventory", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const results = await Promise.allSettled([
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentA1.id)],
      }),
      createBooking({
        userId: fixture.userB.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentB1.id)],
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("TEST 4: sequential last seat", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    await expect(
      createBooking({
        userId: fixture.userB.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentB1.id)],
      }),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE", status: 409 });
  });

  it("TEST 5: reservation expiration releases inventory once", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });

    await prisma.slotReservation.update({
      where: { id: created.reservation!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await expireReservations(new Date());
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const reservation = await prisma.slotReservation.findUniqueOrThrow({
      where: { id: created.reservation!.id },
    });
    expect(reservation.status).toBe("EXPIRED");

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: created.booking.id },
    });
    expect(booking.status).toBe("EXPIRED");

    const updatedSlot = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updatedSlot.available).toBe(1);
  });

  it("TEST 6: concurrent expire workers release once", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    await prisma.slotReservation.update({
      where: { id: created.reservation!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await Promise.all([expireReservations(), expireReservations()]);

    const updatedSlot = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updatedSlot.available).toBe(1);

    const reservation = await prisma.slotReservation.findUniqueOrThrow({
      where: { id: created.reservation!.id },
    });
    expect(reservation.status).toBe("EXPIRED");
  });

  it("TEST 7: payment after expiration fails", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    await prisma.slotReservation.update({
      where: { id: created.reservation!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expireReservations();

    await expect(
      confirmPayment({
        userId: fixture.userA.id,
        paymentId: created.payment!.id,
        amount: created.payment!.amount,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "RESERVATION_EXPIRED" });

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: created.booking.id },
    });
    expect(booking.status).toBe("EXPIRED");
  });

  it("TEST 8: payment vs expiration race — one terminal winner", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    await prisma.slotReservation.update({
      where: { id: created.reservation!.id },
      data: { expiresAt: new Date(Date.now() + 50) },
    });
    // Force near-expiry window
    await prisma.slotReservation.update({
      where: { id: created.reservation!.id },
      data: { expiresAt: new Date() },
    });

    const results = await Promise.allSettled([
      confirmPayment({
        userId: fixture.userA.id,
        paymentId: created.payment!.id,
        amount: created.payment!.amount,
        currency: "USD",
      }),
      expireReservations(new Date(Date.now() + 1000)),
    ]);

    const reservation = await prisma.slotReservation.findUniqueOrThrow({
      where: { id: created.reservation!.id },
    });
    expect(["CONFIRMED", "EXPIRED"]).toContain(reservation.status);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: created.booking.id },
    });
    if (reservation.status === "CONFIRMED") {
      expect(booking.status).toBe("CONFIRMED");
    } else {
      expect(booking.status).toBe("EXPIRED");
    }
    expect(results.length).toBe(2);
  });

  it("TEST 9: idempotency key returns same booking", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 2 });
    const key = `idem-${fixture.suffix}-9`;
    const first = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      idempotencyKey: key,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    const second = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      idempotencyKey: key,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    expect(second.booking.id).toBe(first.booking.id);

    const updated = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updated.available).toBe(1);
  });

  it("TEST 10: duplicate payment webhook is idempotent", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    const eventId = `evt-${fixture.suffix}-10`;
    const first = await confirmPayment({
      paymentId: created.payment!.id,
      providerEventId: eventId,
      amount: created.payment!.amount,
      currency: "USD",
      requireUser: false,
    });
    const second = await confirmPayment({
      paymentId: created.payment!.id,
      providerEventId: eventId,
      amount: created.payment!.amount,
      currency: "USD",
      requireUser: false,
    });
    expect(first.status).toBe("PAID");
    expect(second.status).toBe("PAID");
    expect(second.idempotent).toBe(true);
  });

  it("TEST 11: cannot book another user's student", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const before = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    await expect(
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentB1.id)],
      }),
    ).rejects.toMatchObject({ code: "STUDENT_NOT_OWNED" });
    const after = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(after.available).toBe(before.available);
  });

  it("TEST 12: grade must belong to level", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    // Create grade on a different level
    const otherLevel = await prisma.level.create({
      data: {
        learningMethodId: fixture.learningMethod.id,
        code: `SEC-${fixture.suffix}`,
        name: "Secondary",
      },
    });
    const badGrade = await prisma.grade.create({
      data: {
        levelId: otherLevel.id,
        code: "G1",
        name: "Sec 1",
      },
    });

    await expect(
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [
          studentPayload(fixture, fixture.studentA1.id, {
            gradeId: badGrade.id,
          }),
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_GRADE" });
  });

  it("TEST 13: subject must be applicable to level", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    await expect(
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [
          studentPayload(fixture, fixture.studentA1.id, {
            subjectIds: [fixture.orphanSubject.id],
          }),
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_SUBJECT" });
  });

  it("TEST 14: duplicate student ids rejected", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 2 });
    await expect(
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [
          studentPayload(fixture, fixture.studentA1.id),
          studentPayload(fixture, fixture.studentA1.id),
        ],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("TEST 15: cancelled slot rejected", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, {
      capacity: 1,
      cancelled: true,
    });
    // cancelled slots still need active=false from cancel helper; createSlot sets cancelledAt
    await prisma.trialClassSlot.update({
      where: { id: slot.id },
      data: { active: false },
    });
    await expect(
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentA1.id)],
      }),
    ).rejects.toMatchObject({ code: "SLOT_CANCELLED" });
  });

  it("TEST 16: started slot rejected", async () => {
    const startsAt = new Date(Date.now() - 60_000);
    const slot = await prisma.trialClassSlot.create({
      data: {
        scheduleId: fixture.schedule.id,
        startsAt,
        endsAt: new Date(Date.now() + 60_000),
        capacity: 1,
        available: 1,
        timezone: "Asia/Singapore",
      },
    });
    await expect(
      createBooking({
        userId: fixture.userA.id,
        slotId: slot.id,
        students: [studentPayload(fixture, fixture.studentA1.id)],
      }),
    ).rejects.toMatchObject({ code: "SLOT_EXPIRED" });
  });

  it("TEST 17: transaction rollback restores inventory", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    process.env.TEST_FAIL_AFTER_ACQUIRE = "1";
    try {
      await expect(
        createBooking({
          userId: fixture.userA.id,
          slotId: slot.id,
          students: [studentPayload(fixture, fixture.studentA1.id)],
        }),
      ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    } finally {
      delete process.env.TEST_FAIL_AFTER_ACQUIRE;
    }

    const updated = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updated.available).toBe(1);

    const reservations = await prisma.slotReservation.findMany({
      where: { slotId: slot.id },
    });
    expect(reservations).toHaveLength(0);
  });

  it("TEST 18: concurrent cancel releases inventory once", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });

    const results = await Promise.all([
      cancelBooking(created.booking.id, fixture.userA.id),
      cancelBooking(created.booking.id, fixture.userA.id),
    ]);

    const released = results.filter((r) => r.inventoryReleased).length;
    expect(released).toBe(1);

    const updated = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updated.available).toBe(1);
  });

  it("pricing: total equals sum of TrialClassPrice amounts", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 1 });
    const created = await createBooking({
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    });
    expect(Number(created.booking.total)).toBe(105);
    expect(created.booking.currency).toBe("USD");
    expect(created.payment!.currency).toBe("USD");
  });

  it("capacity decrease below consumed is rejected", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 10 });
    await prisma.trialClassSlot.update({
      where: { id: slot.id },
      data: { available: 3 },
    });

    const { updateTrialClassSlot } = await import(
      "@/server/services/trial-class-slot.service"
    );
    await expect(
      updateTrialClassSlot(slot.id, { capacity: 5 }),
    ).rejects.toMatchObject({ code: "CAPACITY_CONFLICT" });
  });
});
