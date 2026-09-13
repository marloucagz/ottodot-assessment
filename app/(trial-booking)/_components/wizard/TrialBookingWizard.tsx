"use client";

import { useEffect, type MutableRefObject } from "react";
import type { DemoContext, ParentCtx } from "../api";
import { BookingConfirmationStep } from "./BookingConfirmationStep";
import { BookingSummary } from "./BookingSummary";
import { LearningPreferencesStep } from "./LearningPreferencesStep";
import { ParentDetailsStep } from "./ParentDetailsStep";
import { PaymentStep } from "./PaymentStep";
import { ReviewStep } from "./ReviewStep";
import { StudentGradeStep } from "./StudentGradeStep";
import { TrialBookingStepper } from "./TrialBookingStepper";
import { TrialClassStep } from "./TrialClassStep";
import type { WizardAudience } from "./types";
import {
  useTrialBookingWizard,
  type TrialBookingWizardApi,
} from "./useTrialBookingWizard";

export function TrialBookingWizard({
  ctx,
  parent,
  parentKey,
  defaultSlotId,
  compact,
  showSummary = true,
  audience = "customer",
  onLog,
  apiRef,
}: {
  ctx: DemoContext;
  parent: ParentCtx;
  parentKey: "parentA" | "parentB";
  defaultSlotId?: string;
  compact?: boolean;
  showSummary?: boolean;
  audience?: WizardAudience;
  onLog?: (message: string, level?: "info" | "success" | "error") => void;
  apiRef?: MutableRefObject<TrialBookingWizardApi | null>;
}) {
  const api = useTrialBookingWizard({
    ctx,
    parent,
    defaultSlotId,
    compact,
    audience,
    onLog,
  });

  useEffect(() => {
    if (apiRef) apiRef.current = api;
  });

  return (
    <div className={showSummary ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]" : ""}>
      <div className="space-y-4 rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <TrialBookingStepper
          current={api.state.step}
          maxReached={api.maxReached}
          onSelect={api.goTo}
          compact={compact}
        />
        {api.state.error &&
        api.state.step !== "review" &&
        api.state.step !== "payment" ? (
          <p className="text-[13px] text-[#c81e1e]" role="alert">
            {api.state.error}
          </p>
        ) : null}
        {api.state.step === "parent" ? <ParentDetailsStep api={api} /> : null}
        {api.state.step === "student" ? (
          <StudentGradeStep ctx={ctx} api={api} parentKey={parentKey} />
        ) : null}
        {api.state.step === "class" ? (
          <TrialClassStep ctx={ctx} api={api} />
        ) : null}
        {api.state.step === "preferences" ? (
          <LearningPreferencesStep ctx={ctx} api={api} />
        ) : null}
        {api.state.step === "review" ? <ReviewStep ctx={ctx} api={api} /> : null}
        {api.state.step === "payment" ? <PaymentStep api={api} /> : null}
        {api.state.step === "confirmation" ? (
          <BookingConfirmationStep ctx={ctx} api={api} />
        ) : null}
      </div>
      {showSummary ? <BookingSummary ctx={ctx} api={api} /> : null}
    </div>
  );
}

export type { TrialBookingWizardApi };
