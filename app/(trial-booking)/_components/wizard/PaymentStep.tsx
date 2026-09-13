"use client";

import { useCallback } from "react";
import { Btn } from "../ui";
import { customerPaymentStatus, formatMoney } from "./customerCopy";
import { ReservationCountdown } from "./PriceBreakdown";
import { combineQuotes } from "./types";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

export function PaymentStep({ api }: { api: TrialBookingWizardApi }) {
  const {
    state,
    quote,
    earliestExpiry,
    openPaymentTab,
    refreshBooking,
    chooseAnotherClass,
  } = api;
  const bookings = state.bookings;

  const onExpired = useCallback(() => {
    void refreshBooking();
  }, [refreshBooking]);

  if (bookings.length === 0) return null;

  const expired =
    bookings.some(
      (b) =>
        b.booking.status === "EXPIRED" || b.reservation?.status === "EXPIRED",
    ) || state.errorCode === "RESERVATION_EXPIRED";
  const combined = quote ?? combineQuotes(state.quotes);
  const total = combined?.total ?? bookings.reduce((s, b) => s + Number(b.booking.total), 0).toFixed(2);
  const currency = bookings[0]!.booking.currency;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold">Payment</h2>
        <p className="text-[13px] text-[#6b7280]">
          Complete your payment to confirm your child&apos;s trial class.
        </p>
      </div>

      <ReservationCountdown expiresAt={earliestExpiry} onExpired={onExpired} />

      {expired ? (
        <Btn onClick={chooseAnotherClass}>Choose another class</Btn>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-[#6b7280]">Reference</dt>
            <dd>
              {bookings.map((b) => b.booking.reference).join(", ")}
            </dd>
            <dt className="text-[#6b7280]">Status</dt>
            <dd>{customerPaymentStatus(bookings[0]?.payment?.status)}</dd>
            <dt className="text-[#6b7280]">Total</dt>
            <dd className="text-[16px] font-semibold">
              {formatMoney(total, currency)}
            </dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={openPaymentTab}>Pay {formatMoney(total, currency)}</Btn>
            <Btn variant="secondary" onClick={() => void refreshBooking()}>
              I&apos;ve completed payment
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}
