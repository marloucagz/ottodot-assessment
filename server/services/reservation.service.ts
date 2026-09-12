import { Decimal } from "@prisma/client/runtime/library";
import type { DbClient } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ReservationStatus } from "@/lib/constants";

/**
 * Atomically decrement slot inventory if the slot is bookable and has capacity.
 * Returns true if acquired (exactly one row updated).
 */
export async function acquireSlotInventory(
  tx: DbClient,
  slotId: string,
  quantity: number,
  now: Date,
): Promise<boolean> {
  if (quantity <= 0) {
    throw new AppError("VALIDATION_ERROR", "quantity must be > 0", 400);
  }

  const updated = await tx.trialClassSlot.updateMany({
    where: {
      id: slotId,
      active: true,
      cancelledAt: null,
      startsAt: { gt: now },
      available: { gte: quantity },
    },
    data: {
      available: { decrement: quantity },
    },
  });

  return updated.count === 1;
}

/**
 * Conditionally transition reservation ACTIVE -> target and release inventory once.
 */
export async function releaseReservationInventory(
  tx: DbClient,
  reservationId: string,
  nextStatus: typeof ReservationStatus.EXPIRED | typeof ReservationStatus.RELEASED,
  now: Date,
): Promise<boolean> {
  const released = await tx.slotReservation.updateMany({
    where: {
      id: reservationId,
      status: ReservationStatus.ACTIVE,
    },
    data: {
      status: nextStatus,
      releasedAt: now,
    },
  });

  if (released.count !== 1) {
    return false;
  }

  const reservation = await tx.slotReservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  await tx.trialClassSlot.update({
    where: { id: reservation.slotId },
    data: {
      available: { increment: reservation.quantity },
    },
  });

  // Clamp available to capacity (safety)
  const slot = await tx.trialClassSlot.findUniqueOrThrow({
    where: { id: reservation.slotId },
  });
  if (slot.available > slot.capacity) {
    await tx.trialClassSlot.update({
      where: { id: slot.id },
      data: { available: slot.capacity },
    });
  }

  return true;
}

export async function confirmReservation(
  tx: DbClient,
  reservationId: string,
  now: Date,
): Promise<boolean> {
  const confirmed = await tx.slotReservation.updateMany({
    where: {
      id: reservationId,
      status: ReservationStatus.ACTIVE,
      expiresAt: { gt: now },
    },
    data: {
      status: ReservationStatus.CONFIRMED,
      confirmedAt: now,
    },
  });

  return confirmed.count === 1;
}

export function decimalSum(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.add(v), new Decimal(0));
}
