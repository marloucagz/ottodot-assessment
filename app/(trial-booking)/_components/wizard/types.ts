import type { BookingResponse, QuoteResponse } from "../api";

export const WIZARD_STEPS = [
  { id: "parent", label: "Parent Details" },
  { id: "student", label: "Student, Grade & Subject(s)" },
  { id: "class", label: "Trial Class" },
  { id: "preferences", label: "Student Capabilities" },
  { id: "review", label: "Review" },
  { id: "payment", label: "Payment" },
  { id: "confirmation", label: "Confirmation" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export type WizardAudience = "customer" | "demo";

export type WizardParent = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type WizardStudent = {
  studentId: string;
  learningMethodId: string;
  levelId: string;
  gradeId: string;
  subjectIds: string[];
  capabilityIds: string[];
};

export type WizardState = {
  step: WizardStepId;
  parent: WizardParent;
  slotBySubjectId: Record<string, string>;
  students: WizardStudent[];
  quotes: QuoteResponse[];
  bookings: BookingResponse[];
  error: string | null;
  errorCode: string | null;
  busy: boolean;
};

export type ListedSlot = {
  id: string;
  capacity: number;
  available: number;
  startsAt: string;
  endsAt: string;
  timezone: string;
  active: boolean;
  cancelledAt: string | null;
  schedule?: { name: string; timezone: string } | null;
};

export function selectedSubjectIds(students: WizardStudent[]) {
  return [...new Set(students.flatMap((s) => s.subjectIds))];
}

export function combineQuotes(quotes: QuoteResponse[]): QuoteResponse | null {
  if (quotes.length === 0) return null;
  if (quotes.length === 1) return quotes[0]!;
  const add = (key: "subtotal" | "discount" | "tax" | "total") =>
    quotes.reduce((sum, q) => sum + Number(q[key]), 0).toFixed(2);
  return {
    quantity: quotes.reduce((sum, q) => sum + q.quantity, 0),
    currency: quotes[0]!.currency,
    subtotal: add("subtotal"),
    discount: add("discount"),
    tax: add("tax"),
    total: add("total"),
    slot: quotes[0]!.slot,
    lines: quotes.flatMap((q) => q.lines),
  };
}

export { formatMoney, formatSlotRange as formatSlotTime } from "./customerCopy";
