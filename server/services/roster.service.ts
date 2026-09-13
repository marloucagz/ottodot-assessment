import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  BookingStatus,
  ReservationStatus,
} from "@/lib/constants";

export type SlotRosterEntry = {
  bookingReference: string;
  bookingStatus: string;
  reservationStatus: string;
  paymentStatus: string | null;
  child: { id: string; firstName: string; lastName: string | null };
  parent: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  level: string;
  grade: string;
  subjects: string[];
};

export type SlotRoster = {
  slot: {
    id: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    capacity: number;
    available: number;
    active: boolean;
    cancelledAt: string | null;
  };
  counts: {
    confirmed: number;
    reserved: number;
    seatsHeld: number;
  };
  entries: SlotRosterEntry[];
};

/**
 * Roster for a trial class slot: ACTIVE + CONFIRMED reservations only.
 */
export async function getSlotRoster(slotId: string): Promise<SlotRoster> {
  const slot = await prisma.trialClassSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot) {
    throw new AppError("SLOT_NOT_FOUND", "Slot not found", 404);
  }

  const reservations = await prisma.slotReservation.findMany({
    where: {
      slotId,
      status: {
        in: [ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED],
      },
    },
    include: {
      booking: {
        include: {
          user: true,
          payment: true,
          students: {
            include: {
              student: true,
              subjects: { include: { subject: true } },
              level: true,
              grade: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const entries: SlotRosterEntry[] = [];
  let confirmed = 0;
  let reserved = 0;
  let seatsHeld = 0;

  for (const reservation of reservations) {
    const booking = reservation.booking;
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.EXPIRED
    ) {
      continue;
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      confirmed += 1;
    } else {
      reserved += 1;
    }
    seatsHeld += reservation.quantity;

    for (const line of booking.students) {
      entries.push({
        bookingReference: booking.reference,
        bookingStatus: booking.status,
        reservationStatus: reservation.status,
        paymentStatus: booking.payment?.status ?? null,
        child: {
          id: line.student.id,
          firstName: line.student.firstName,
          lastName: line.student.lastName,
        },
        parent: {
          id: booking.user.id,
          email: booking.user.email,
          firstName: booking.user.firstName,
          lastName: booking.user.lastName,
        },
        level: line.levelSnapshot ?? line.level.name,
        grade: line.gradeSnapshot ?? line.grade.name,
        subjects: line.subjects.map(
          (s) => s.subjectSnapshot ?? s.subject.name,
        ),
      });
    }
  }

  return {
    slot: {
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      timezone: slot.timezone,
      capacity: slot.capacity,
      available: slot.available,
      active: slot.active,
      cancelledAt: slot.cancelledAt?.toISOString() ?? null,
    },
    counts: { confirmed, reserved, seatsHeld },
    entries,
  };
}
