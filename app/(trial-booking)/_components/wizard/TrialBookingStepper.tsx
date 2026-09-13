"use client";

import { WIZARD_STEPS, type WizardStepId } from "./types";

export function TrialBookingStepper({
  current,
  maxReached,
  onSelect,
  compact,
}: {
  current: WizardStepId;
  maxReached: number;
  onSelect: (id: WizardStepId) => void;
  compact?: boolean;
}) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === current);

  if (compact) {
    return (
      <div className="space-y-1">
        <p className="text-[12px] font-medium text-[#6b7280]">
          STEP {currentIndex + 1} OF {WIZARD_STEPS.length}
        </p>
        <p className="text-[13px] font-medium">{WIZARD_STEPS[currentIndex]?.label}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]">
          <div
            className="h-full bg-[#3ecf8e]"
            style={{
              width: `${((currentIndex + 1) / WIZARD_STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <ol className="flex flex-wrap gap-2 text-[12px]">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = s.id === current;
        const clickable = i <= maxReached && i <= currentIndex;
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(s.id)}
              className={`rounded-full px-2.5 py-1 ${
                active
                  ? "bg-[#ecfdf5] font-medium text-[#166534]"
                  : done
                    ? "text-[#3c8c6c]"
                    : "text-[#9ca3af]"
              } disabled:cursor-default`}
            >
              {done ? "✓ " : active ? "● " : "○ "}
              {s.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
