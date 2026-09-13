"use client";

import type { DemoContext } from "../api";
import { catalogSubjectList } from "./catalog";
import { Btn } from "../ui";
import { formatClassDate, formatClassTime, formatMoney } from "./customerCopy";
import { preferenceSummaryLabels } from "./learningPreferences";
import { PriceBreakdown } from "./PriceBreakdown";
import { selectedSubjectIds } from "./types";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

export function ReviewStep({
  ctx,
  api,
}: {
  ctx: DemoContext;
  api: TrialBookingWizardApi;
}) {
  const { state, listedSlots, quote, back, goTo, submitBooking } = api;
  const allChildren = ctx.users.parentA.students.concat(
    ctx.users.parentB.students,
  );
  const prefs = ctx.catalog.preferenceCapabilities ?? [];
  const subjects = catalogSubjectList(ctx);
  const subjectIds = selectedSubjectIds(state.students);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold">Review your trial booking</h2>
        <p className="text-[13px] text-[#6b7280]">
          Please check your details before continuing to payment.
        </p>
      </div>

      <section className="rounded-lg border border-[#e5e7eb] p-4 text-[13px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Parent</h3>
          <button type="button" className="text-[#166534]" onClick={() => goTo("parent")}>
            Edit
          </button>
        </div>
        <p className="font-medium">
          {state.parent.firstName} {state.parent.lastName}
        </p>
        <p className="text-[#6b7280]">{state.parent.email}</p>
        <p className="text-[#6b7280]">{state.parent.phone || "No phone number"}</p>
      </section>

      {state.students.map((row, i) => {
        const child = allChildren.find((c) => c.id === row.studentId);
        const summary = preferenceSummaryLabels(row.capabilityIds, prefs);
        const subjectNames = row.subjectIds.map(
          (id) => subjects.find((s) => s.id === id)?.name ?? "Subject",
        );
        const grade = ctx.catalog.grades.find((g) => g.id === row.gradeId);
        return (
          <section
            key={row.studentId}
            className="rounded-lg border border-[#e5e7eb] p-4 text-[13px]"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">
                {child
                  ? `${child.firstName} ${child.lastName ?? ""}`.trim()
                  : `Student ${i + 1}`}
              </h3>
              <button
                type="button"
                className="text-[#166534]"
                onClick={() => goTo("student")}
              >
                Edit
              </button>
            </div>
            <p className="text-[#6b7280]">
              {ctx.catalog.learningMethod.name}
              <br />
              {ctx.catalog.level.name}
              {grade ? ` · ${grade.name}` : ""}
            </p>
            <p className="mt-2">Subjects</p>
            <ul className="list-inside list-disc text-[#6b7280]">
              {subjectNames.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 text-[#6b7280]">
              <p>
                Computer use
                <br />
                <span className="text-[#1c1c1c]">
                  {summary.computer[0] ?? "Not specified"}
                </span>
              </p>
              <p>
                Parent availability
                <br />
                <span className="text-[#1c1c1c]">
                  {summary.parent[0] ?? "Not specified"}
                </span>
              </p>
              <p>
                Devices
                <br />
                <span className="text-[#1c1c1c]">
                  {summary.devices.length
                    ? summary.devices.join(", ")
                    : "Not specified"}
                </span>
              </p>
              <p>
                Second device
                <br />
                <span className="text-[#1c1c1c]">
                  {summary.second[0] ?? "Not specified"}
                </span>
              </p>
            </div>
          </section>
        );
      })}

      <section className="rounded-lg border border-[#e5e7eb] p-4 text-[13px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Trial classes</h3>
          <button type="button" className="text-[#166534]" onClick={() => goTo("class")}>
            Change
          </button>
        </div>
        {subjectIds.map((sid) => {
          const name = subjects.find((s) => s.id === sid)?.name ?? "Trial class";
          const slot = listedSlots.find((s) => s.id === state.slotBySubjectId[sid]);
          return (
            <div key={sid} className="mb-3 last:mb-0">
              <p className="font-medium">{name}</p>
              {slot ? (
                <p className="text-[#6b7280]">
                  {formatClassDate(slot.startsAt)}
                  <br />
                  {formatClassTime(slot.startsAt, slot.endsAt)}
                </p>
              ) : (
                <p className="text-[#6b7280]">Not selected</p>
              )}
            </div>
          );
        })}
      </section>

      {quote ? <PriceBreakdown quote={quote} /> : (
        <p className="text-[13px] text-[#6b7280]">Preparing your booking…</p>
      )}

      {state.error ? (
        <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#991b1b]">
          <p>{state.error}</p>
          {state.errorCode === "SLOT_UNAVAILABLE" ? (
            <button
              type="button"
              className="mt-2 text-[#166534]"
              onClick={() => goTo("class")}
            >
              View available classes
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-between">
        <Btn variant="secondary" onClick={back}>
          Back
        </Btn>
        <Btn disabled={state.busy} onClick={() => void submitBooking()}>
          {state.busy ? "Confirming your booking…" : "Continue to payment"}
        </Btn>
      </div>
    </div>
  );
}
