"use client";

import { useEffect, useRef, useState } from "react";
import type { QuoteResponse } from "../api";
import { formatMoney } from "./customerCopy";

export function PriceBreakdown({ quote }: { quote: QuoteResponse }) {
  return (
    <section className="rounded-lg border border-[#e5e7eb] p-4 text-[13px]">
      <h3 className="mb-3 text-[14px] font-semibold">Price summary</h3>
      <dl className="space-y-1.5">
        {quote.lines.map((line) => (
          <div
            key={`${line.studentId}-${line.subjectId}`}
            className="flex justify-between text-[#6b7280]"
          >
            <dt>
              {line.studentName} · {line.subjectName}
            </dt>
            <dd>{formatMoney(line.unitPrice, quote.currency)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-[#e5e7eb] pt-2 text-[#6b7280]">
          <dt>Discount</dt>
          <dd>
            {Number(quote.discount) > 0 ? "-" : ""}
            {formatMoney(quote.discount, quote.currency)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatMoney(quote.subtotal, quote.currency)}</dd>
        </div>
        <div className="flex justify-between text-[#6b7280]">
          <dt>Tax</dt>
          <dd>{formatMoney(quote.tax, quote.currency)}</dd>
        </div>
        <div className="flex justify-between border-t border-[#e5e7eb] pt-2 text-[16px] font-semibold">
          <dt>Total</dt>
          <dd>{formatMoney(quote.total, quote.currency)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ReservationCountdown({
  expiresAt,
  onExpired,
}: {
  expiresAt: string | null | undefined;
  onExpired?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remaining = expiresAt
    ? Math.max(0, new Date(expiresAt).getTime() - now)
    : 0;
  const expired = Boolean(expiresAt) && remaining <= 0;

  useEffect(() => {
    if (!expired || fired.current) return;
    fired.current = true;
    onExpired?.();
  }, [expired, onExpired]);

  useEffect(() => {
    fired.current = false;
  }, [expiresAt]);

  if (!expiresAt) return null;

  const totalSec = Math.floor(remaining / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  return (
    <div
      className={`rounded-lg border px-4 py-5 text-center ${
        expired
          ? "border-[#fecaca] bg-[#fef2f2]"
          : "border-[#b7e4cd] bg-[#ecfdf5]"
      }`}
    >
      <p className="text-[13px] font-medium text-[#1c1c1c]">
        {expired
          ? "Your reservation has expired"
          : "Your class is reserved for you"}
      </p>
      <p className="mt-2 text-[32px] font-semibold tracking-wide">
        {expired ? "00:00" : `${mm}:${ss}`}
      </p>
      <p className="mt-1 text-[13px] text-[#6b7280]">
        {expired
          ? "Unfortunately, we couldn't hold this class any longer. Please select another available class."
          : "Complete payment before the timer expires to keep your selected class."}
      </p>
    </div>
  );
}
