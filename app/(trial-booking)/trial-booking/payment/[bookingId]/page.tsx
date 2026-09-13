"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ApiError,
  apiJson,
  PAYMENT_CHANNEL,
  type BookingResponse,
} from "../../../_components/api";
import { Btn } from "../../../_components/ui";
import {
  customerError,
  customerPaymentStatus,
  formatClassDate,
  formatClassTime,
  formatMoney,
} from "../../../_components/wizard/customerCopy";
import { ReservationCountdown } from "../../../_components/wizard/PriceBreakdown";

function PaymentInner() {
  const params = useSearchParams();
  const routeParams = useParams<{ bookingId: string }>();
  const userId = params.get("userId") ?? "";
  const routeId =
    typeof routeParams.bookingId === "string"
      ? routeParams.bookingId
      : Array.isArray(routeParams.bookingId)
        ? routeParams.bookingId[0]
        : null;
  const extra = (params.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const bookingIds = [...new Set([routeId, ...extra].filter(Boolean) as string[])];

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [slots, setSlots] = useState<
    Array<{ startsAt: string; endsAt: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"card" | "bank" | "wallet">("card");
  const [card, setCard] = useState("4242424242424242");
  const [expiry, setExpiry] = useState("12/30");
  const [cvv, setCvv] = useState("123");

  useEffect(() => {
    if (bookingIds.length === 0 || !userId) return;
    void Promise.all(
      bookingIds.map((id) =>
        apiJson<BookingResponse>(
          `/api/bookings/${id}?userId=${encodeURIComponent(userId)}`,
        ),
      ),
    )
      .then(async (rows) => {
        setBookings(rows);
        const slotRows = await Promise.all(
          rows.map(async (row) => {
            if (!row.reservation?.slotId) return null;
            try {
              const s = await apiJson<{ startsAt: string; endsAt: string }>(
                `/api/trial-class-slots/${row.reservation.slotId}`,
              );
              return {
                startsAt:
                  typeof s.startsAt === "string"
                    ? s.startsAt
                    : new Date(s.startsAt).toISOString(),
                endsAt:
                  typeof s.endsAt === "string"
                    ? s.endsAt
                    : new Date(s.endsAt).toISOString(),
              };
            } catch {
              return null;
            }
          }),
        );
        setSlots(slotRows.filter((s): s is { startsAt: string; endsAt: string } => Boolean(s)));
        if (rows.every((r) => r.payment?.status === "PAID")) {
          for (const row of rows) {
            try {
              const ch = new BroadcastChannel(PAYMENT_CHANNEL);
              ch.postMessage({ bookingId: row.booking.id });
              ch.close();
            } catch {
              /* ignore */
            }
          }
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? customerError(err.code, err.message)
            : "We couldn't find this booking.",
        );
      });
  }, [bookingIds.join(","), userId]);

  function notifyAll(rows: BookingResponse[]) {
    for (const row of rows) {
      try {
        const ch = new BroadcastChannel(PAYMENT_CHANNEL);
        ch.postMessage({ bookingId: row.booking.id });
        ch.close();
      } catch {
        /* ignore */
      }
    }
  }

  async function pay() {
    if (bookings.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const row of bookings) {
        await apiJson("/api/payments/simulate/confirm", {
          method: "POST",
          body: JSON.stringify({
            userId,
            bookingId: row.booking.id,
            paymentId: row.payment?.id,
          }),
        });
      }
      const refreshed = await Promise.all(
        bookings.map((row) =>
          apiJson<BookingResponse>(
            `/api/bookings/${row.booking.id}?userId=${encodeURIComponent(userId)}`,
          ),
        ),
      );
      setBookings(refreshed);
      notifyAll(refreshed);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? customerError(err.code, err.message)
          : "We couldn't complete your payment. Please try again if time remains.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!userId) {
    return (
      <p className="p-8 text-[13px]">
        This payment link is missing information. Please return to your booking
        and try again.
      </p>
    );
  }

  if (bookings.length === 0) {
    return (
      <main className="mx-auto max-w-md px-6 py-10 text-[13px] text-[#6b7280]">
        {error ?? "Processing payment…"}
      </main>
    );
  }

  const alreadyPaid = bookings.every((b) => b.payment?.status === "PAID");
  const expired = bookings.some(
    (b) =>
      b.booking.status === "EXPIRED" || b.reservation?.status === "EXPIRED",
  );
  const total = bookings
    .reduce((sum, b) => sum + Number(b.booking.total), 0)
    .toFixed(2);
  const currency = bookings[0]!.booking.currency;
  const earliest = bookings
    .map((b) => b.reservation?.expiresAt)
    .filter((v): v is string => Boolean(v))
    .sort()[0];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="text-[18px] font-semibold">Complete your payment</h1>
      <p className="text-[13px] text-[#6b7280]">
        Confirm your child&apos;s trial class. No real card is charged.
      </p>

      <ReservationCountdown expiresAt={earliest} />

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 text-[13px]">
        <p className="font-medium">Booking summary</p>
        {slots.map((slot, i) => (
          <p key={`${slot.startsAt}-${i}`} className="mt-2">
            {formatClassDate(slot.startsAt)}
            <br />
            {formatClassTime(slot.startsAt, slot.endsAt)}
          </p>
        ))}
        <p className="mt-2 text-[16px] font-semibold">
          {formatMoney(total, currency)}
        </p>
        <p className="text-[#6b7280]">
          {bookings.map((b) => b.booking.reference).join(", ")}
        </p>
        <p className="text-[#6b7280]">
          {customerPaymentStatus(bookings[0]?.payment?.status)}
        </p>
      </section>

      {alreadyPaid ? (
        <p className="rounded-md border border-[#b7e4cd] bg-[#ecfdf5] px-3 py-2 text-[13px] text-[#166534]">
          Payment successful. You can close this tab and return to your booking.
        </p>
      ) : expired ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#991b1b]">
          Your reservation has expired. Please return to booking and choose
          another class.
        </p>
      ) : (
        <section className="space-y-3 rounded-lg border border-[#e5e7eb] bg-white p-4 text-[13px]">
          <p className="font-medium">Payment method</p>
          {(
            [
              ["card", "Credit / Debit card"],
              ["bank", "Bank transfer"],
              ["wallet", "Digital wallet"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="block">
              <input
                type="radio"
                name="method"
                className="mr-2"
                checked={method === id}
                onChange={() => setMethod(id)}
              />
              {label}
            </label>
          ))}
          {method === "card" ? (
            <div className="space-y-2 pt-2">
              <label className="block">
                Card number
                <input
                  className="mt-1 w-full rounded-[4px] border border-[#d1d5db] px-3 py-2"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  Expiry
                  <input
                    className="mt-1 w-full rounded-[4px] border border-[#d1d5db] px-3 py-2"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </label>
                <label>
                  CVV
                  <input
                    className="mt-1 w-full rounded-[4px] border border-[#d1d5db] px-3 py-2"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {error ? (
        <p className="text-[13px] text-[#c81e1e]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Btn variant="secondary" onClick={() => window.close()}>
          Cancel
        </Btn>
        {!alreadyPaid && !expired ? (
          <Btn disabled={busy} onClick={() => void pay()}>
            {busy
              ? "Processing payment…"
              : `Pay ${formatMoney(total, currency)}`}
          </Btn>
        ) : null}
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<p className="p-8 text-[13px]">Loading…</p>}>
      <PaymentInner />
    </Suspense>
  );
}
