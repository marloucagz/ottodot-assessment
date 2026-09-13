"use client";

import { useMemo, useState } from "react";
import { Btn } from "../ui";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
        {required ? <span className="text-[#c81e1e]"> *</span> : (
          <span className="font-normal text-[#9ca3af]"> (optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-[#c81e1e]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-[4px] border border-[#d1d5db] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#3ecf8e]";

export function ParentDetailsStep({ api }: { api: TrialBookingWizardApi }) {
  const { state, updateParent, next, validateParent } = api;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = useMemo(
    () => validateParent(state.parent),
    [state.parent, validateParent],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold">Parent details</h2>
        <p className="text-[13px] text-[#6b7280]">
          Tell us about yourself so we can keep you updated about your child&apos;s
          trial class.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="firstName"
          label="First name"
          required
          error={touched.firstName ? errors.firstName : undefined}
        >
          <input
            id="firstName"
            className={inputClass}
            autoComplete="given-name"
            value={state.parent.firstName}
            onChange={(e) => updateParent({ firstName: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
          />
        </Field>
        <Field
          id="lastName"
          label="Last name"
          required
          error={touched.lastName ? errors.lastName : undefined}
        >
          <input
            id="lastName"
            className={inputClass}
            autoComplete="family-name"
            value={state.parent.lastName}
            onChange={(e) => updateParent({ lastName: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
          />
        </Field>
        <Field
          id="email"
          label="Email"
          required
          error={touched.email ? errors.email : undefined}
        >
          <input
            id="email"
            type="email"
            className={inputClass}
            autoComplete="email"
            value={state.parent.email}
            onChange={(e) => updateParent({ email: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
        </Field>
        <Field id="phone" label="Phone number">
          <input
            id="phone"
            type="tel"
            className={inputClass}
            autoComplete="tel"
            value={state.parent.phone}
            onChange={(e) => updateParent({ phone: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Btn disabled={state.busy} onClick={() => void next()}>
          {state.busy ? "Saving…" : "Continue"}
        </Btn>
      </div>
    </div>
  );
}
