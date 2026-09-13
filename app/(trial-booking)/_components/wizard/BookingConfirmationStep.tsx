"use client";

import type { DemoContext } from "../api";
import { catalogSubjectList } from "./catalog";
import { Btn } from "../ui";
import {
  customerBookingStatus,
  customerPaymentStatus,
  formatClassDate,
  formatClassTime,
  formatMoney,
} from "./customerCopy";
import { combineQuotes, selectedSubjectIds } from "./types";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

export function BookingConfirmationStep({
  ctx,
  api,
}: {
  ctx: DemoContext;
  api: TrialBookingWizardApi;
}) {
  const { state, listedSlots, quote, resetWizard, chooseAnotherClass } = api;
  const bookings = state.bookings;
  if (bookings.length === 0) return null;

  const paid = bookings.every(
    (b) => b.booking.status === "CONFIRMED" || b.payment?.status === "PAID",
  );
  const expired = bookings.some(
    (b) =>
      b.booking.status === "EXPIRED" || b.reservation?.status === "EXPIRED",
  );
  const subjects = catalogSubjectList(ctx);
  const children = ctx.users.parentA.students.concat(ctx.users.parentB.students);
  const childNames = state.students
    .map((row) => {
      const child = children.find((c) => c.id === row.studentId);
      return child
        ? `${child.firstName} ${child.lastName ?? ""}`.trim()
        : "Your child";
    })
    .join(", ");
  const combined = quote ?? combineQuotes(state.quotes);
  const total =
    combined?.total ??
    bookings.reduce((s, b) => s + Number(b.booking.total), 0).toFixed(2);

  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-semibold">
        {paid
          ? "Trial class booked!"
          : expired
            ? "Your reservation has expired"
            : customerBookingStatus(bookings[0]!.booking.status)}
      </h2>
      <p className="text-[13px] text-[#6b7280]">
        {paid
          ? "Your trial class has been successfully confirmed."
          : expired
            ? "Please choose another available class."
            : customerPaymentStatus(bookings[0]?.payment?.status)}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px]">
        {selectedSubjectIds(state.students).map((sid) => {
          const name = subjects.find((s) => s.id === sid)?.name ?? "Class";
          const slot = listedSlots.find(
            (s) => s.id === state.slotBySubjectId[sid],
          );
          return (
            <div key={sid} className="contents">
              <dt className="text-[#6b7280]">{name}</dt>
              <dd>
                {slot
                  ? `${formatClassDate(slot.startsAt)} · ${formatClassTime(slot.startsAt, slot.endsAt)}`
                  : "—"}
              </dd>
            </div>
          );
        })}
        <dt className="text-[#6b7280]">Student</dt>
        <dd>{childNames}</dd>
        <dt className="text-[#6b7280]">Total paid</dt>
        <dd className="font-semibold">
          {formatMoney(total, bookings[0]!.booking.currency)}
        </dd>
        <dt className="text-[#6b7280]">Booking reference</dt>
        <dd>{bookings.map((b) => b.booking.reference).join(", ")}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        {expired ? (
          <Btn onClick={chooseAnotherClass}>Choose another class</Btn>
        ) : (
          <Btn variant="secondary" onClick={resetWizard}>
            Book another trial
          </Btn>
        )}
      </div>
    </div>
  );
}
