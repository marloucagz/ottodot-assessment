export const CURRENCY_USD = "USD" as const;

export const BookingStatus = {
  DRAFT: "DRAFT",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type BookingStatus =
  (typeof BookingStatus)[keyof typeof BookingStatus];

export const ReservationStatus = {
  ACTIVE: "ACTIVE",
  CONFIRMED: "CONFIRMED",
  EXPIRED: "EXPIRED",
  RELEASED: "RELEASED",
} as const;
export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];
