export function formatMoney(amount: string, _currency = "USD") {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n.toFixed(2) : amount;
  return `$${value}`;
}

export function seatsLabel(available: number) {
  if (available <= 0) return "Fully booked";
  if (available === 1) return "1 seat available";
  return `${available} seats available`;
}

export function durationMinutes(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return 60;
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function formatClassDate(startsAt: string | null) {
  if (!startsAt) return "Upcoming class";
  return new Date(startsAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatClassTime(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return "";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

export function formatSlotRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return "Trial class";
  return `${formatClassDate(startsAt)} · ${formatClassTime(startsAt, endsAt)}`;
}

export function classTitle(subjectNames: string[]) {
  const names = subjectNames.filter(Boolean);
  if (names.length === 0) return "Trial class";
  if (names.length === 1) return `${names[0]} trial class`;
  if (names.length === 2) return `${names[0]} & ${names[1]} trial class`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]} trial class`;
}

export function customerBookingStatus(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PAYMENT_PENDING":
      return "Payment required";
    case "CONFIRMED":
      return "Confirmed";
    case "EXPIRED":
      return "Reservation expired";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "In progress";
  }
}

export function customerPaymentStatus(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "FAILED":
      return "Payment could not be completed";
    case "PENDING":
    case "PENDING_PAYMENT":
      return "Payment required";
    case "EXPIRED":
      return "Reservation expired";
    default:
      return "Payment required";
  }
}

export function customerError(code?: string, fallback?: string) {
  switch (code) {
    case "SLOT_UNAVAILABLE":
      return "This class was just booked by another family. Please choose another available time.";
    case "SLOT_CANCELLED":
    case "SLOT_INACTIVE":
      return "This class is no longer available. Please choose another time.";
    case "SLOT_EXPIRED":
      return "This class time has already started. Please choose another time.";
    case "STUDENT_NOT_OWNED":
    case "CHILD_NOT_OWNED":
      return "We couldn't verify this student. Please select one of your children.";
    case "STUDENT_NOT_FOUND":
      return "We couldn't find that student. Please select one of your children.";
    case "INVALID_GRADE":
    case "INVALID_LEVEL_GRADE_RELATION":
      return "That grade is not available for the selected level. Please choose another grade.";
    case "INVALID_LEVEL":
      return "That level is not available for the selected learning method. Please choose another option.";
    case "INVALID_SUBJECT":
      return "One of the selected subjects is not available for this level. Please choose again.";
    case "INVALID_LEARNING_METHOD":
      return "Please choose a valid learning method.";
    case "RESERVATION_EXPIRED":
    case "BOOKING_EXPIRED":
      return "Your reservation has expired. Please select the class again.";
    case "PAYMENT_AMOUNT_MISMATCH":
    case "PAYMENT_CURRENCY_MISMATCH":
      return "The payment could not be completed because the booking total has changed. Please return to your booking and try again.";
    case "PAYMENT_NOT_ALLOWED":
    case "PAYMENT_FAILED":
      return "We couldn't complete your payment. Please try again if time remains.";
    case "VALIDATION_ERROR":
      return fallback && !fallback.includes("_")
        ? fallback
        : "Please check your details and try again.";
    default:
      if (fallback && !/[A-Z_]{4,}/.test(fallback) && !fallback.includes(":")) {
        return fallback;
      }
      return "Something went wrong while completing your booking. Please try again.";
  }
}

export const COPY = {
  learningMethod:
    "Lessons follow the Singapore mathematics and science curriculum.",
  level: "For children in primary school.",
  grade: "Select your child's current grade.",
  subjects: "Choose the subject or subjects your child would like to try.",
  trialClass:
    "Choose a convenient date and time for your child's trial class.",
  preferences:
    "These questions help us better understand how we can support your child during the trial.",
};
