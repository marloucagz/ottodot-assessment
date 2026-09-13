"use client";

import type { DemoContext } from "../api";
import { Btn } from "../ui";
import { COPY } from "./customerCopy";
import { PREFERENCE_QUESTIONS } from "./learningPreferences";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

export function LearningPreferencesStep({
  ctx,
  api,
}: {
  ctx: DemoContext;
  api: TrialBookingWizardApi;
}) {
  const { state, updateStudent, next, back } = api;
  const catalog = ctx.catalog.preferenceCapabilities ?? [];
  const byCode = new Map(catalog.map((c) => [c.code, c]));
  const children = ctx.users.parentA.students.concat(ctx.users.parentB.students);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold">
          Help us prepare for your child&apos;s trial
        </h2>
        <p className="text-[13px] text-[#6b7280]">{COPY.preferences}</p>
      </div>

      {state.students.map((row, index) => {
        const child = children.find((c) => c.id === row.studentId);
        const name = child?.firstName?.trim() || "your child";
        return (
          <div key={row.studentId} className="space-y-3">
            {state.students.length > 1 ? (
              <h3 className="text-[14px] font-medium">{name}</h3>
            ) : null}
            {PREFERENCE_QUESTIONS.map((q) => {
              const options = q.codes
                .map((code) => byCode.get(code))
                .filter(Boolean);
              if (options.length === 0) return null;
              return (
                <fieldset
                  key={`${row.studentId}-${q.id}`}
                  className="space-y-2 rounded-lg border border-[#e5e7eb] bg-white p-4"
                >
                  <legend className="text-[13px] font-medium">{q.heading}</legend>
                  <p className="text-[13px] text-[#1c1c1c]">{q.prompt(name)}</p>
                  {q.help ? (
                    <p className="text-[12px] text-[#6b7280]">{q.help}</p>
                  ) : null}
                  <div className="space-y-2 pt-1">
                    {options.map((opt) => {
                      const checked = row.capabilityIds.includes(opt!.id);
                      return (
                        <label key={opt!.id} className="block text-[13px]">
                          <input
                            type={q.type === "multi" ? "checkbox" : "radio"}
                            name={`${row.studentId}-${q.id}`}
                            className="mr-2"
                            checked={checked}
                            onChange={() => {
                              const groupIds = options.map((o) => o!.id);
                              if (q.type === "multi") {
                                const nextIds = checked
                                  ? row.capabilityIds.filter((id) => id !== opt!.id)
                                  : [...row.capabilityIds, opt!.id];
                                updateStudent(index, { capabilityIds: nextIds });
                                return;
                              }
                              const withoutGroup = row.capabilityIds.filter(
                                (id) => !groupIds.includes(id),
                              );
                              updateStudent(index, {
                                capabilityIds: [...withoutGroup, opt!.id],
                              });
                            }}
                          />
                          {opt!.name}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        );
      })}

      <div className="flex justify-between">
        <Btn variant="secondary" onClick={back}>
          Back
        </Btn>
        <Btn disabled={state.busy} onClick={() => void next()}>
          {state.busy ? "Preparing your booking…" : "Continue to review"}
        </Btn>
      </div>
    </div>
  );
}
