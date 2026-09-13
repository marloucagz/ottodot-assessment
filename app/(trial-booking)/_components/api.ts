export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? body.code ?? "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = body.code ?? "REQUEST_FAILED";
    this.details = body.details;
  }
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export type BookingResponse = {
  booking: {
    id: string;
    reference: string;
    status: string;
    total: string;
    subtotal: string;
    discount?: string;
    tax?: string;
    currency: string;
    expiresAt: string | null;
    userId: string;
    students: unknown[];
  };
  reservation: {
    id: string;
    slotId: string;
    quantity: number;
    status: string;
    expiresAt: string;
  } | null;
  payment: {
    id: string;
    status: string;
    amount: string;
    currency: string;
  } | null;
};

export type QuoteResponse = {
  quantity: number;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  slot: {
    id: string;
    capacity: number;
    available: number;
    startsAt: string;
    endsAt: string;
    timezone: string;
  };
  lines: Array<{
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    unitPrice: string;
  }>;
};

export type CatalogItem = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type DemoContext = {
  seeded: boolean;
  catalog: {
    learningMethod: CatalogItem;
    level: CatalogItem;
    grade: CatalogItem & { levelId?: string };
    grades: Array<CatalogItem & { levelId: string }>;
    subjects: {
      math: CatalogItem;
      science: CatalogItem;
    };
    levelSubjectIds: string[];
    subjectList?: CatalogItem[];
    capabilitiesBySubject: Record<
      string,
      Array<{ id: string; code: string; name: string; subjectId: string | null }>
    >;
    preferenceCapabilities?: Array<{
      id: string;
      code: string;
      name: string;
      subjectId: string | null;
    }>;
  };
  slots: {
    lastSeat: SlotCtx;
    multiChild: SlotCtx;
    happyPath: SlotCtx;
    expiration: SlotCtx;
  };
  users: {
    parentA: ParentCtx;
    parentB: ParentCtx;
  };
  scenarios: string[];
};

export type SlotCtx = {
  id: string;
  label: string;
  capacity: number;
  available: number;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  active: boolean;
  cancelledAt: string | null;
};

export type ParentCtx = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  studentIds: string[];
  students: Array<{ id: string; firstName: string; lastName: string | null }>;
};

export type SlotRoster = {
  slot: {
    id: string;
    capacity: number;
    available: number;
    startsAt: string;
    endsAt: string;
  };
  counts: { confirmed: number; reserved: number; seatsHeld: number };
  entries: Array<{
    bookingReference: string;
    bookingStatus: string;
    reservationStatus: string;
    paymentStatus: string | null;
    child: { firstName: string; lastName: string | null };
    parent: { email: string };
    level: string;
    grade: string;
    subjects: string[];
  }>;
};

export function studentPayload(
  ctx: DemoContext,
  studentId: string,
  overrides?: Partial<{
    gradeId: string;
    subjectIds: string[];
    learningMethodId: string;
    levelId: string;
    capabilityIds: string[];
  }>,
) {
  return {
    studentId,
    learningMethodId:
      overrides?.learningMethodId ?? ctx.catalog.learningMethod.id,
    levelId: overrides?.levelId ?? ctx.catalog.level.id,
    gradeId: overrides?.gradeId ?? ctx.catalog.grade.id,
    subjectIds: overrides?.subjectIds ?? [
      ctx.catalog.subjects.math.id,
      ctx.catalog.subjects.science.id,
    ],
    capabilityIds: overrides?.capabilityIds ?? [],
  };
}

export const PAYMENT_CHANNEL = "trial-booking-payment";
