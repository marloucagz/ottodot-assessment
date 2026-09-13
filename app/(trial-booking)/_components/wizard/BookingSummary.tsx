"use client";

import type { DemoContext } from "../api";
import { catalogSubjectList } from "./catalog";
import {
  formatClassDate,
  formatClassTime,
  formatMoney,
} from "./customerCopy";
import { combineQuotes, selectedSubjectIds } from "./types";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

export function BookingSummary({
  ctx,
  api,
}: {
  ctx: DemoContext;
  api: TrialBookingWizardApi;
}) {
  const { state, listedSlots, quote } = api;
  const parentName =
    `${state.parent.firstName} ${state.parent.lastName}`.trim() || "—";
  const subjects = catalogSubjectList(ctx);
  const children = ctx.users.parentA.students.concat(ctx.users.parentB.students);
  const combined = quote ?? combineQuotes(state.quotes);

  return (
    <aside className="h-fit space-y-3 rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:sticky lg:top-4">
      <h2 className="text-[13px] font-medium">Your booking</h2>
      <div className="space-y-3 text-[13px] text-[#6b7280]">
        <div>
          <span className="block text-[12px] uppercase tracking-wide text-[#9ca3af]">
            Parent
          </span>
          {parentName}
          <br />
          {state.parent.email || "—"}
        </div>
        <div>
          <span className="block text-[12px] uppercase tracking-wide text-[#9ca3af]">
            Trial class
          </span>
          {selectedSubjectIds(state.students).length === 0
            ? "—"
            : selectedSubjectIds(state.students).map((sid) => {
                const name = subjects.find((s) => s.id === sid)?.name ?? "Class";
                const slot = listedSlots.find(
                  (s) => s.id === state.slotBySubjectId[sid],
                );
                return (
                  <div key={sid} className="mt-1">
                    <span className="text-[#1c1c1c]">{name}</span>
                    {slot ? (
                      <>
                        <br />
                        {formatClassDate(slot.startsAt)}
                        <br />
                        {formatClassTime(slot.startsAt, slot.endsAt)}
                      </>
                    ) : (
                      <span className="block">Not selected yet</span>
                    )}
                  </div>
                );
              })}
        </div>
        <div>
          <span className="block text-[12px] uppercase tracking-wide text-[#9ca3af]">
            Student
          </span>
          {state.students.length === 0
            ? "—"
            : state.students.map((s) => {
                const child = children.find((c) => c.id === s.studentId);
                return (
                  <div key={s.studentId}>
                    {child
                      ? `${child.firstName} ${child.lastName ?? ""}`.trim()
                      : "Child"}
                  </div>
                );
              })}
        </div>
        {combined ? (
          <p className="border-t border-[#e5e7eb] pt-2 text-[16px] font-semibold text-[#1c1c1c]">
            Total {formatMoney(combined.total, combined.currency)}
          </p>
        ) : null}
        {state.bookings.length > 0 ? (
          <p className="text-[12px]">
            {state.bookings.map((b) => b.booking.reference).join(", ")}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
