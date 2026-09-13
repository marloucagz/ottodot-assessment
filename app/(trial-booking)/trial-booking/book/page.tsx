"use client";

import { useEffect, useState } from "react";
import { apiJson, type DemoContext } from "../../_components/api";
import { TrialBookingWizard } from "../../_components/wizard/TrialBookingWizard";

export default function TrialBookPage() {
  const [ctx, setCtx] = useState<DemoContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiJson<DemoContext>(
          "/api/demo/trial-booking/context",
        );
        setCtx(data);
      } catch {
        setError(
          "We couldn't load available classes right now. Please try again in a moment.",
        );
      }
    })();
  }, []);

  if (!ctx) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <p className="text-[13px] text-[#6b7280]">
          {error ?? "Loading available classes…"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-[22px] font-semibold">Trial class booking</h1>
        <p className="text-[14px] text-[#6b7280]">
          Book a live trial class for your child. Your seat is held only after
          you review and continue to payment.
        </p>
      </header>
      <TrialBookingWizard
        ctx={ctx}
        parent={ctx.users.parentA}
        parentKey="parentA"
        audience="customer"
      />
    </main>
  );
}
