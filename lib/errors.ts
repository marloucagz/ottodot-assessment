export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "SLOT_NOT_FOUND"
  | "SLOT_UNAVAILABLE"
  | "SLOT_CANCELLED"
  | "SLOT_EXPIRED"
  | "SLOT_INACTIVE"
  | "RESERVATION_NOT_FOUND"
  | "RESERVATION_EXPIRED"
  | "RESERVATION_NOT_ACTIVE"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_ALREADY_CONFIRMED"
  | "BOOKING_ALREADY_CANCELLED"
  | "BOOKING_INVALID_STATE"
  | "INVALID_BOOKING_STATE"
  | "STUDENT_NOT_FOUND"
  | "STUDENT_NOT_OWNED"
  | "INVALID_LEVEL"
  | "INVALID_GRADE"
  | "INVALID_SUBJECT"
  | "INVALID_CAPABILITY"
  | "INVALID_LEARNING_METHOD"
  | "PRICE_NOT_FOUND"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_NOT_ALLOWED"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "PAYMENT_ALREADY_PAID"
  | "CAPACITY_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "ALREADY_SEEDED"
  | "NOT_SEEDED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorResponse(error: unknown): {
  status: number;
  body: { code: string; message: string; details?: unknown };
} {
  if (isAppError(error)) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
  }

  console.error(error);
  return {
    status: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };
}

export function jsonError(error: unknown): Response {
  const { status, body } = toErrorResponse(error);
  return Response.json(body, { status });
}
