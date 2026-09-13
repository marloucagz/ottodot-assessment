"use client";

import type { DemoContext } from "../api";
import { catalogSubjectList } from "./catalog";
import { Btn } from "../ui";
import { COPY } from "./customerCopy";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

const selectClass =
  "w-full rounded-[4px] border border-[#d1d5db] bg-white px-3 py-2 text-[13px]";

export function StudentGradeStep({
  ctx,
  api,
  parentKey,
}: {
  ctx: DemoContext;
  api: TrialBookingWizardApi;
  parentKey: "parentA" | "parentB";
}) {
  const {
    state,
    updateStudent,
    addStudent,
    removeStudent,
    next,
    back,
  } = api;
  const parent = ctx.users[parentKey];
  const subjects = catalogSubjectList(ctx);
  const allowedSubjects = subjects.filter((s) =>
    (ctx.catalog.levelSubjectIds ?? []).includes(s.id),
  );
  const grades =
    ctx.catalog.grades?.length > 0
      ? ctx.catalog.grades
      : [ctx.catalog.grade];
  const used = new Set(state.students.map((s) => s.studentId));
  const canAdd = parent.students.some((s) => !used.has(s.id));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold">Tell us about your child</h2>
        <p className="text-[13px] text-[#6b7280]">
          We&apos;ll use this information to show suitable trial classes.
        </p>
      </div>

      {state.students.map((row, index) => (
        <div
          key={`${row.studentId}-${index}`}
          className="space-y-3 rounded-lg border border-[#e5e7eb] p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-medium">
              {state.students.length > 1 ? `Child ${index + 1}` : "Student"}
            </h3>
            {state.students.length > 1 ? (
              <button
                type="button"
                className="text-[12px] text-[#991b1b]"
                onClick={() => removeStudent(index)}
              >
                Remove
              </button>
            ) : null}
          </div>
          <label className="block text-[13px]">
            Student <span className="text-[#c81e1e]">*</span>
            <select
              className={`${selectClass} mt-1`}
              value={row.studentId}
              onChange={(e) =>
                updateStudent(index, { studentId: e.target.value })
              }
            >
              {parent.students.map((child) => (
                <option
                  key={child.id}
                  value={child.id}
                  disabled={used.has(child.id) && child.id !== row.studentId}
                >
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px]">
            Learning method <span className="text-[#c81e1e]">*</span>
            <select
              className={`${selectClass} mt-1`}
              value={row.learningMethodId}
              onChange={(e) =>
                updateStudent(index, { learningMethodId: e.target.value })
              }
            >
              <option value={ctx.catalog.learningMethod.id}>
                {ctx.catalog.learningMethod.name}
              </option>
            </select>
            <span className="mt-1 block text-[12px] text-[#6b7280]">
              {COPY.learningMethod}
            </span>
          </label>
          <label className="block text-[13px]">
            Level <span className="text-[#c81e1e]">*</span>
            <select
              className={`${selectClass} mt-1`}
              value={row.levelId}
              onChange={(e) =>
                updateStudent(index, {
                  levelId: e.target.value,
                  gradeId: grades[0]?.id ?? row.gradeId,
                })
              }
            >
              <option value={ctx.catalog.level.id}>
                {ctx.catalog.level.name}
              </option>
            </select>
            <span className="mt-1 block text-[12px] text-[#6b7280]">
              {COPY.level}
            </span>
          </label>
          <label className="block text-[13px]">
            Grade <span className="text-[#c81e1e]">*</span>
            <select
              className={`${selectClass} mt-1`}
              value={row.gradeId}
              onChange={(e) => updateStudent(index, { gradeId: e.target.value })}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[12px] text-[#6b7280]">
              {COPY.grade}
            </span>
          </label>
          <fieldset>
            <legend className="text-[13px] font-medium">
              Subjects <span className="text-[#c81e1e]">*</span>
            </legend>
            <p className="mb-1 text-[12px] text-[#6b7280]">{COPY.subjects}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              {allowedSubjects.map((sub) => {
                const checked = row.subjectIds.includes(sub.id);
                return (
                  <label key={sub.id} className="text-[13px]">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={checked}
                      onChange={(e) => {
                        const nextIds = e.target.checked
                          ? [...row.subjectIds, sub.id]
                          : row.subjectIds.filter((id) => id !== sub.id);
                        updateStudent(index, { subjectIds: nextIds });
                      }}
                    />
                    {sub.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      ))}

      {canAdd ? (
        <Btn variant="secondary" onClick={addStudent}>
          Add another child
        </Btn>
      ) : null}

      <div className="flex justify-between">
        <Btn variant="secondary" onClick={back}>
          Back
        </Btn>
        <Btn onClick={() => void next()}>Continue</Btn>
      </div>
    </div>
  );
}
