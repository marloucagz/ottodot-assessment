import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { config } from "@/lib/config";
import {
  BookingStatus,
  CURRENCY_USD,
  PaymentStatus,
  ReservationStatus,
} from "@/lib/constants";
import {
  acquireSlotInventory,
  confirmReservation,
  decimalSum,
  releaseReservationInventory,
} from "@/server/services/reservation.service";

export type CreateBookingStudentInput = {
  studentId: string;
  learningMethodId: string;
  levelId: string;
  gradeId: string;
  subjectIds: string[];
  capabilityIds: string[];
};

export type CreateBookingInput = {
  userId: string;
  slotId: string;
  idempotencyKey?: string;
  students: CreateBookingStudentInput[];
};

function assertUniqueIds(ids: string[], code: string, label: string) {
  if (new Set(ids).size !== ids.length) {
    throw new AppError(code as never, `Duplicate ${label}`, 400);
  }
}

function bookingReference(): string {
  const year = new Date().getUTCFullYear();
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `TRIAL-${year}-${suffix}`;
}

async function loadBookingPayload(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      students: {
        include: {
          subjects: true,
          capabilities: true,
        },
      },
      reservation: true,
      payment: true,
    },
  });
  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }
  return formatBookingResponse(booking);
}

function formatBookingResponse(
  booking: Prisma.BookingGetPayload<{
    include: {
      students: { include: { subjects: true; capabilities: true } };
      reservation: true;
      payment: true;
    };
  }>,
) {
  return {
    booking: {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      total: booking.total.toString(),
      subtotal: booking.subtotal.toString(),
      currency: booking.currency,
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      userId: booking.userId,
      students: booking.students,
    },
    reservation: booking.reservation
      ? {
          id: booking.reservation.id,
          slotId: booking.reservation.slotId,
          quantity: booking.reservation.quantity,
          status: booking.reservation.status,
          expiresAt: booking.reservation.expiresAt.toISOString(),
        }
      : null,
    payment: booking.payment
      ? {
          id: booking.payment.id,
          status: booking.payment.status,
          amount: booking.payment.amount.toString(),
          currency: booking.payment.currency,
        }
      : null,
  };
}

type ResolvedStudent = {
  input: CreateBookingStudentInput;
  learningMethodName: string;
  levelName: string;
  gradeName: string;
  subjects: Array<{ id: string; name: string; unitPrice: Decimal }>;
  capabilities: Array<{ id: string; name: string }>;
};

async function resolveBookingStudents(
  input: CreateBookingInput,
): Promise<{ resolvedStudents: ResolvedStudent[]; linePrices: Decimal[] }> {
  const user = await prisma.user.findFirst({
    where: { id: input.userId, active: true },
  });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found", 404);
  }

  const studentIds = input.students.map((s) => s.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, active: true },
  });
  if (students.length !== studentIds.length) {
    throw new AppError("STUDENT_NOT_FOUND", "One or more students not found", 404);
  }
  for (const student of students) {
    if (student.parentId !== input.userId) {
      throw new AppError(
        "STUDENT_NOT_OWNED",
        "Student does not belong to user",
        403,
      );
    }
  }

  const linePrices: Decimal[] = [];
  const resolvedStudents: ResolvedStudent[] = [];

  for (const child of input.students) {
    assertUniqueIds(child.subjectIds, "VALIDATION_ERROR", "subjects");
    assertUniqueIds(child.capabilityIds, "VALIDATION_ERROR", "capabilities");

    const learningMethod = await prisma.learningMethod.findFirst({
      where: { id: child.learningMethodId, active: true },
    });
    if (!learningMethod) {
      throw new AppError(
        "INVALID_LEARNING_METHOD",
        "Learning method not found or inactive",
        400,
      );
    }

    const level = await prisma.level.findFirst({
      where: { id: child.levelId, active: true },
    });
    if (!level || level.learningMethodId !== child.learningMethodId) {
      throw new AppError(
        "INVALID_LEVEL",
        "Level invalid for learning method",
        400,
      );
    }

    const grade = await prisma.grade.findFirst({
      where: { id: child.gradeId, active: true },
    });
    if (!grade || grade.levelId !== child.levelId) {
      throw new AppError("INVALID_GRADE", "Grade does not belong to level", 400);
    }

    const levelSubjects = await prisma.levelSubject.findMany({
      where: {
        levelId: child.levelId,
        subjectId: { in: child.subjectIds },
        active: true,
      },
      include: { subject: true },
    });
    if (levelSubjects.length !== child.subjectIds.length) {
      throw new AppError(
        "INVALID_SUBJECT",
        "Subject not applicable to level",
        400,
      );
    }
    for (const ls of levelSubjects) {
      if (!ls.subject.active) {
        throw new AppError("INVALID_SUBJECT", "Subject inactive", 400);
      }
    }

    const prices = await prisma.trialClassPrice.findMany({
      where: {
        levelId: child.levelId,
        gradeId: child.gradeId,
        subjectId: { in: child.subjectIds },
        active: true,
        currency: CURRENCY_USD,
      },
    });
    if (prices.length !== child.subjectIds.length) {
      throw new AppError(
        "PRICE_NOT_FOUND",
        "No active USD price for level/grade/subject",
        409,
      );
    }

    const subjectRows = child.subjectIds.map((subjectId) => {
      const price = prices.find((p) => p.subjectId === subjectId)!;
      const subject = levelSubjects.find((ls) => ls.subjectId === subjectId)!
        .subject;
      linePrices.push(price.amount);
      return {
        id: subjectId,
        name: subject.name,
        unitPrice: price.amount,
      };
    });

    const capabilities: Array<{ id: string; name: string }> = [];
    if (child.capabilityIds.length > 0) {
      const caps = await prisma.capability.findMany({
        where: { id: { in: child.capabilityIds }, active: true },
      });
      if (caps.length !== child.capabilityIds.length) {
        throw new AppError(
          "INVALID_CAPABILITY",
          "Capability not found or inactive",
          400,
        );
      }
      for (const cap of caps) {
        if (cap.subjectId && !child.subjectIds.includes(cap.subjectId)) {
          throw new AppError(
            "INVALID_CAPABILITY",
            "Capability not valid for selected subjects",
            400,
          );
        }
        capabilities.push({ id: cap.id, name: cap.name });
      }
    }

    resolvedStudents.push({
      input: child,
      learningMethodName: learningMethod.name,
      levelName: level.name,
      gradeName: grade.name,
      subjects: subjectRows,
      capabilities,
    });
  }

  return { resolvedStudents, linePrices };
}

export async function createBooking(input: CreateBookingInput) {
  const quantity = input.students.length;
  if (quantity <= 0) {
    throw new AppError("VALIDATION_ERROR", "At least one student is required", 400);
  }

  assertUniqueIds(
    input.students.map((s) => s.studentId),
    "VALIDATION_ERROR",
    "students",
  );

  if (input.idempotencyKey) {
    const existing = await prisma.booking.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: {
        students: { include: { subjects: true, capabilities: true } },
        reservation: true,
        payment: true,
      },
    });
    if (existing) {
      return formatBookingResponse(existing);
    }
  }

  const { resolvedStudents, linePrices } = await resolveBookingStudents(input);
  const subtotal = decimalSum(linePrices);
  const total = subtotal;

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + config.reservationTtlSeconds * 1000,
  );

  try {
    const bookingId = await prisma.$transaction(
      async (tx) => {
        const acquired = await acquireSlotInventory(
          tx,
          input.slotId,
          quantity,
          now,
        );
        if (!acquired) {
          const slot = await tx.trialClassSlot.findUnique({
            where: { id: input.slotId },
          });
          if (!slot) {
            throw new AppError("SLOT_NOT_FOUND", "Slot not found", 404);
          }
          if (slot.cancelledAt || !slot.active) {
            throw new AppError("SLOT_CANCELLED", "Slot is cancelled", 409);
          }
          if (slot.startsAt <= now) {
            throw new AppError("SLOT_EXPIRED", "Slot has already started", 409);
          }
          throw new AppError("SLOT_UNAVAILABLE", "Slot unavailable", 409);
        }

        // Test-only hook to verify transaction rollback restores inventory.
        if (process.env.TEST_FAIL_AFTER_ACQUIRE === "1") {
          throw new AppError(
            "INTERNAL_ERROR",
            "Forced failure after inventory acquire",
            500,
          );
        }

        let booking;
        try {
          booking = await tx.booking.create({
            data: {
              reference: bookingReference(),
              userId: input.userId,
              idempotencyKey: input.idempotencyKey,
              status: BookingStatus.PENDING_PAYMENT,
              expiresAt,
              subtotal,
              total,
              currency: CURRENCY_USD,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            input.idempotencyKey
          ) {
            throw new AppError(
              "IDEMPOTENCY_CONFLICT",
              "Concurrent idempotent create",
              409,
            );
          }
          throw error;
        }

        for (const resolved of resolvedStudents) {
          const studentBooking = await tx.studentBooking.create({
            data: {
              bookingId: booking.id,
              studentId: resolved.input.studentId,
              learningMethodId: resolved.input.learningMethodId,
              levelId: resolved.input.levelId,
              gradeId: resolved.input.gradeId,
              learningMethodSnapshot: resolved.learningMethodName,
              levelSnapshot: resolved.levelName,
              gradeSnapshot: resolved.gradeName,
              subjects: {
                create: resolved.subjects.map((subject) => ({
                  subjectId: subject.id,
                  subjectSnapshot: subject.name,
                  unitPrice: subject.unitPrice,
                  currency: CURRENCY_USD,
                })),
              },
              capabilities: {
                create: resolved.capabilities.map((capability) => ({
                  capabilityId: capability.id,
                  capabilitySnapshot: capability.name,
                })),
              },
            },
          });
          void studentBooking;
        }

        await tx.slotReservation.create({
          data: {
            slotId: input.slotId,
            bookingId: booking.id,
            quantity,
            status: ReservationStatus.ACTIVE,
            expiresAt,
          },
        });

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            status: PaymentStatus.PENDING,
            amount: total,
            currency: CURRENCY_USD,
            provider: "simulate",
          },
        });

        return booking.id;
      },
      { maxWait: 15_000, timeout: 30_000 },
    );

    return loadBookingPayload(bookingId);
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === "IDEMPOTENCY_CONFLICT" &&
      input.idempotencyKey
    ) {
      const existing = await prisma.booking.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: {
          students: { include: { subjects: true, capabilities: true } },
          reservation: true,
          payment: true,
        },
      });
      if (existing) {
        return formatBookingResponse(existing);
      }
    }
    throw error;
  }
}

export async function getBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      students: { include: { subjects: true, capabilities: true } },
      reservation: true,
      payment: true,
    },
  });
  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }
  if (booking.userId !== userId) {
    throw new AppError("FORBIDDEN", "Booking does not belong to user", 403);
  }
  return formatBookingResponse(booking);
}

export async function cancelBooking(bookingId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { reservation: true, payment: true },
    });
    if (!booking) {
      throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }
    if (booking.userId !== userId) {
      throw new AppError("FORBIDDEN", "Booking does not belong to user", 403);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return { bookingId, status: booking.status, inventoryReleased: false };
    }
    if (booking.status === BookingStatus.EXPIRED) {
      throw new AppError(
        "INVALID_BOOKING_STATE",
        "Cannot cancel expired booking",
        409,
      );
    }

    const now = new Date();
    let inventoryReleased = false;

    if (booking.reservation?.status === ReservationStatus.ACTIVE) {
      inventoryReleased = await releaseReservationInventory(
        tx,
        booking.reservation.id,
        ReservationStatus.RELEASED,
        now,
      );
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      // No automatic refund in demo
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });
      return { bookingId, status: BookingStatus.CANCELLED, inventoryReleased: false };
    }

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.DRAFT],
        },
      },
      data: { status: BookingStatus.CANCELLED },
    });

    if (updated.count !== 1 && booking.status !== BookingStatus.CANCELLED) {
      // Another process may have transitioned; re-read
      const latest = await tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
      });
      if (latest.status !== BookingStatus.CANCELLED) {
        throw new AppError(
          "INVALID_BOOKING_STATE",
          `Cannot cancel booking in status ${latest.status}`,
          409,
        );
      }
    }

    if (
      booking.payment &&
      booking.payment.status === PaymentStatus.PENDING
    ) {
      await tx.payment.updateMany({
        where: {
          id: booking.payment.id,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.EXPIRED },
      });
    }

    return {
      bookingId,
      status: BookingStatus.CANCELLED,
      inventoryReleased,
    };
  });
}

export async function confirmPayment(params: {
  userId?: string;
  paymentId?: string;
  bookingId?: string;
  amount?: string | number;
  currency?: string;
  providerEventId?: string;
  providerReference?: string;
  requireUser?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = params.paymentId
      ? await tx.payment.findUnique({
          where: { id: params.paymentId },
          include: {
            booking: { include: { reservation: true } },
          },
        })
      : await tx.payment.findFirst({
          where: { bookingId: params.bookingId },
          include: {
            booking: { include: { reservation: true } },
          },
        });

    if (!payment) {
      throw new AppError("PAYMENT_NOT_FOUND", "Payment not found", 404);
    }

    if (params.requireUser !== false) {
      if (!params.userId || payment.booking.userId !== params.userId) {
        throw new AppError("FORBIDDEN", "Payment does not belong to user", 403);
      }
    }

    // Idempotent success
    if (payment.status === PaymentStatus.PAID) {
      if (
        params.providerEventId &&
        payment.providerEventId &&
        payment.providerEventId !== params.providerEventId
      ) {
        // already paid under different event — still idempotent OK if same payment
      }
      return {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        status: PaymentStatus.PAID,
        idempotent: true,
      };
    }

    if (params.providerEventId) {
      const existingEvent = await tx.payment.findFirst({
        where: { providerEventId: params.providerEventId },
      });
      if (existingEvent && existingEvent.id !== payment.id) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "providerEventId already used",
          409,
        );
      }
    }

    if (params.amount !== undefined) {
      const incoming = new Decimal(params.amount);
      if (!incoming.equals(payment.amount)) {
        throw new AppError(
          "PAYMENT_AMOUNT_MISMATCH",
          "Payment amount mismatch",
          409,
        );
      }
    }
    if (params.currency !== undefined && params.currency !== payment.currency) {
      throw new AppError(
        "PAYMENT_CURRENCY_MISMATCH",
        "Payment currency mismatch",
        409,
      );
    }
    if (payment.currency !== CURRENCY_USD) {
      throw new AppError(
        "PAYMENT_CURRENCY_MISMATCH",
        "Server currency must be USD",
        409,
      );
    }

    const reservation = payment.booking.reservation;
    if (!reservation) {
      throw new AppError(
        "RESERVATION_NOT_FOUND",
        "Reservation not found",
        404,
      );
    }

    const slot = await tx.trialClassSlot.findUnique({
      where: { id: reservation.slotId },
    });
    if (!slot) {
      throw new AppError("SLOT_NOT_FOUND", "Slot not found", 404);
    }
    if (slot.cancelledAt) {
      throw new AppError("SLOT_CANCELLED", "Slot is cancelled", 409);
    }

    const now = new Date();

    if (reservation.status === ReservationStatus.EXPIRED) {
      throw new AppError("RESERVATION_EXPIRED", "Reservation expired", 409);
    }
    if (reservation.status === ReservationStatus.RELEASED) {
      throw new AppError(
        "RESERVATION_NOT_ACTIVE",
        "Reservation released",
        409,
      );
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      if (reservation.status === ReservationStatus.CONFIRMED) {
        return {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          status: PaymentStatus.PAID,
          idempotent: true,
        };
      }
      throw new AppError(
        "RESERVATION_NOT_ACTIVE",
        "Reservation not active",
        409,
      );
    }

    const confirmed = await confirmReservation(tx, reservation.id, now);
    if (!confirmed) {
      throw new AppError("RESERVATION_EXPIRED", "Reservation expired", 409);
    }

    const bookingUpdated = await tx.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: BookingStatus.PENDING_PAYMENT,
      },
      data: { status: BookingStatus.CONFIRMED },
    });
    if (bookingUpdated.count !== 1) {
      throw new AppError(
        "INVALID_BOOKING_STATE",
        "Booking cannot be confirmed",
        409,
      );
    }

    const paymentUpdated = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
      data: {
        status: PaymentStatus.PAID,
        paidAt: now,
        providerEventId: params.providerEventId ?? payment.providerEventId,
        providerReference:
          params.providerReference ?? payment.providerReference,
      },
    });
    if (paymentUpdated.count !== 1) {
      throw new AppError("PAYMENT_NOT_ALLOWED", "Payment cannot be paid", 409);
    }

    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: PaymentStatus.PAID,
      idempotent: false,
    };
  });
}

export async function expireReservations(now = new Date()) {
  const due = await prisma.slotReservation.findMany({
    where: {
      status: ReservationStatus.ACTIVE,
      expiresAt: { lte: now },
    },
    select: { id: true, bookingId: true },
    take: 200,
  });

  let expired = 0;
  for (const row of due) {
    const did = await prisma.$transaction(async (tx) => {
      const ok = await releaseReservationInventory(
        tx,
        row.id,
        ReservationStatus.EXPIRED,
        now,
      );
      if (!ok) return false;

      await tx.booking.updateMany({
        where: {
          id: row.bookingId,
          status: BookingStatus.PENDING_PAYMENT,
        },
        data: { status: BookingStatus.EXPIRED },
      });

      await tx.payment.updateMany({
        where: {
          bookingId: row.bookingId,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.EXPIRED },
      });

      return true;
    });
    if (did) expired += 1;
  }

  return { scanned: due.length, expired };
}

export async function reconcileInventory() {
  const slots = await prisma.trialClassSlot.findMany();
  const issues: Array<Record<string, unknown>> = [];

  for (const slot of slots) {
    if (slot.available < 0 || slot.available > slot.capacity) {
      issues.push({
        type: "BOUNDS",
        slotId: slot.id,
        available: slot.available,
        capacity: slot.capacity,
      });
    }

    const holds = await prisma.slotReservation.aggregate({
      where: {
        slotId: slot.id,
        status: {
          in: [ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED],
        },
      },
      _sum: { quantity: true },
    });
    const held = holds._sum.quantity ?? 0;
    const expectedAvailable = slot.capacity - held;
    if (expectedAvailable !== slot.available) {
      issues.push({
        type: "MISMATCH",
        slotId: slot.id,
        available: slot.available,
        expectedAvailable,
        held,
        capacity: slot.capacity,
      });
    }
  }

  console.info("[inventory.reconcile]", { issueCount: issues.length, issues });
  return { issueCount: issues.length, issues };
}
