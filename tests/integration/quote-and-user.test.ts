import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  createBooking,
  quoteBooking,
} from "@/server/services/booking.service";
import { updateUser } from "@/server/services/user.service";
import {
  createSlot,
  getTestPrisma,
  seedBookingFixture,
  studentPayload,
} from "../helpers/fixtures";

describe("quoteBooking and user update", () => {
  let prisma: PrismaClient;
  let fixture: Awaited<ReturnType<typeof seedBookingFixture>>;

  beforeAll(async () => {
    prisma = getTestPrisma();
    fixture = await seedBookingFixture(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("quote matches create totals and does not change inventory", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 4 });
    const input = {
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentA1.id)],
    };

    const quote = await quoteBooking(input);
    const afterQuote = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(afterQuote.available).toBe(slot.available);
    expect(Number(quote.discount)).toBe(0);
    expect(Number(quote.tax)).toBe(0);
    expect(quote.quantity).toBe(1);

    const created = await createBooking(input);
    expect(created.booking.subtotal).toBe(quote.subtotal);
    expect(created.booking.total).toBe(quote.total);
    expect(Number(created.booking.discount)).toBe(0);
    expect(Number(created.booking.tax)).toBe(0);
    expect(created.booking.currency).toBe(quote.currency);

    const afterCreate = await prisma.trialClassSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(afterCreate.available).toBe(slot.available - 1);
  });

  it("quote rejects invalid grade the same as create", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 2 });
    const input = {
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [
        studentPayload(fixture, fixture.studentA1.id, {
          gradeId: fixture.math.id,
        }),
      ],
    };

    await expect(quoteBooking(input)).rejects.toMatchObject({
      code: "INVALID_GRADE",
    });
    await expect(createBooking(input)).rejects.toMatchObject({
      code: "INVALID_GRADE",
    });
    expect(await prisma.trialClassSlot.findUniqueOrThrow({ where: { id: slot.id } })).toMatchObject({
      available: 2,
    });
  });

  it("quote rejects invalid subject the same as create", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 2 });
    const input = {
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [
        studentPayload(fixture, fixture.studentA1.id, {
          subjectIds: [fixture.orphanSubject.id],
        }),
      ],
    };

    await expect(quoteBooking(input)).rejects.toMatchObject({
      code: "INVALID_SUBJECT",
    });
    await expect(createBooking(input)).rejects.toMatchObject({
      code: "INVALID_SUBJECT",
    });
  });

  it("quote rejects student ownership the same as create", async () => {
    const slot = await createSlot(prisma, fixture.schedule.id, { capacity: 2 });
    const input = {
      userId: fixture.userA.id,
      slotId: slot.id,
      students: [studentPayload(fixture, fixture.studentB1.id)],
    };

    await expect(quoteBooking(input)).rejects.toMatchObject({
      code: "STUDENT_NOT_OWNED",
    });
    await expect(createBooking(input)).rejects.toMatchObject({
      code: "STUDENT_NOT_OWNED",
    });
  });

  it("PATCH user updates fields", async () => {
    const updated = await updateUser(fixture.userA.id, {
      firstName: "Patched",
      lastName: "Parent",
      phone: "+15555550100",
    });
    expect(updated.firstName).toBe("Patched");
    expect(updated.lastName).toBe("Parent");
    expect(updated.phone).toBe("+15555550100");
  });

  it("rejects a unique email conflict", async () => {
    try {
      await updateUser(fixture.userA.id, { email: fixture.userB.email });
      throw new Error("expected unique email conflict");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
      expect((err as AppError).status).toBe(409);
    }
  });
});
