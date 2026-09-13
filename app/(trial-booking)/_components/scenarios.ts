import {
  ApiError,
  apiJson,
  studentPayload,
  type BookingResponse,
  type DemoContext,
  type SlotRoster,
} from "./api";
import type { LogEntry, LogLevel } from "./EventLog";

export type Assertion = { label: string; pass: boolean };

export type ScenarioResult = {
  pass: boolean;
  summary: string;
  assertions: Assertion[];
  inventory?: { capacity: number; available: number };
};

type LogFn = (message: string, level?: LogLevel) => void;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function resetScenario(id: string, log: LogFn) {
  log(`Reset scenario ${id}…`);
  const result = await apiJson<{
    slot: { id: string; capacity: number; available: number };
  }>(`/api/demo/trial-booking/scenarios/${id}/reset`, { method: "POST" });
  log(
    `Slot restored · available ${result.slot.available}/${result.slot.capacity}`,
    "success",
  );
  return result.slot;
}

async function fetchSlot(slotId: string) {
  return apiJson<{
    id: string;
    capacity: number;
    available: number;
    active: boolean;
    cancelledAt: string | null;
  }>(`/api/trial-class-slots/${slotId}`);
}

async function createBookingPublic(
  body: Record<string, unknown>,
): Promise<BookingResponse> {
  return apiJson<BookingResponse>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function createBookingDemo(
  body: Record<string, unknown>,
): Promise<BookingResponse> {
  return apiJson<BookingResponse>("/api/demo/trial-booking/book", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function settledOk(r: PromiseSettledResult<BookingResponse>) {
  return r.status === "fulfilled" ? r.value : null;
}

function settledErr(r: PromiseSettledResult<BookingResponse>) {
  if (r.status !== "rejected") return null;
  const reason = r.reason;
  if (reason instanceof ApiError) return reason;
  return new ApiError(500, {
    code: "INTERNAL_ERROR",
    message: reason instanceof Error ? reason.message : "failed",
  });
}

const FLOW_STEPS = [
  "Select child",
  "Select class",
  "Select level",
  "Select grade",
  "Select subjects",
] as const;

export async function animateFlow(label: string, log: LogFn) {
  for (const step of FLOW_STEPS) {
    log(`${label}: ${step} ✓`);
    await sleep(40);
  }
}

export const SCENARIO_META: Array<{
  id: string;
  title: string;
  description: string;
}> = [
  {
    id: "normal",
    title: "Normal Booking",
    description: "Reserve then mock-pay on the happy-path slot.",
  },
  {
    id: "last-seat-race",
    title: "Last Seat Race",
    description: "Two parents race for capacity=1 concurrently.",
  },
  {
    id: "high-concurrency",
    title: "High Concurrency",
    description: "20 concurrent bookings against capacity 4.",
  },
  {
    id: "multi-child-race",
    title: "Multi-Child Race",
    description: "Two qty=2 bookings against capacity 3.",
  },
  {
    id: "duplicate-submission",
    title: "Duplicate Submission",
    description: "Same idempotency key twice — one booking.",
  },
  {
    id: "stale-availability",
    title: "Stale Availability",
    description: "UI shows 1 seat; server rejects after race.",
  },
  {
    id: "reservation-expiration",
    title: "Reservation Expiration",
    description: "Short TTL then expire job restores inventory.",
  },
  {
    id: "payment-after-expiration",
    title: "Payment After Expiration",
    description: "Pay after expire must be rejected.",
  },
  {
    id: "payment-vs-expiration",
    title: "Payment vs Expiration Race",
    description: "Confirm and expire concurrently — one winner.",
  },
  {
    id: "cancellation-race",
    title: "Cancellation Race",
    description: "Double cancel releases inventory once.",
  },
  {
    id: "slot-cancellation",
    title: "Slot Cancellation",
    description: "Cancelled slot rejects new bookings.",
  },
  {
    id: "invalid-configuration",
    title: "Inactive Configuration",
    description: "Deactivated level rejects booking.",
  },
  {
    id: "invalid-relationship",
    title: "Invalid Relationship",
    description: "Grade/subject mismatch rejected.",
  },
  {
    id: "child-ownership",
    title: "Child Ownership",
    description: "Parent B cannot book Parent A’s child.",
  },
  {
    id: "roster",
    title: "Roster",
    description: "Confirmed bookings appear on slot roster.",
  },
];

export async function runScenario(
  id: string,
  ctx: DemoContext,
  log: LogFn,
  onUsers?: (users: Array<{ label: string; steps: string[]; outcome: string }>) => void,
): Promise<ScenarioResult> {
  switch (id) {
    case "normal":
      return runNormal(ctx, log);
    case "last-seat-race":
      return runLastSeat(ctx, log, onUsers);
    case "high-concurrency":
      return runHighConcurrency(ctx, log);
    case "multi-child-race":
      return runMultiChild(ctx, log, onUsers);
    case "duplicate-submission":
      return runDuplicate(ctx, log);
    case "stale-availability":
      return runStale(ctx, log);
    case "reservation-expiration":
      return runExpiration(ctx, log);
    case "payment-after-expiration":
      return runPayAfterExpire(ctx, log);
    case "payment-vs-expiration":
      return runPayVsExpire(ctx, log);
    case "cancellation-race":
      return runCancelRace(ctx, log);
    case "slot-cancellation":
      return runSlotCancel(ctx, log);
    case "invalid-configuration":
      return runInactiveConfig(ctx, log);
    case "invalid-relationship":
      return runInvalidRel(ctx, log);
    case "child-ownership":
      return runOwnership(ctx, log);
    case "roster":
      return runRoster(ctx, log);
    default:
      return {
        pass: false,
        summary: `Unknown scenario ${id}`,
        assertions: [],
      };
  }
}

async function runNormal(ctx: DemoContext, log: LogFn): Promise<ScenarioResult> {
  const slot = await resetScenario("normal", log);
  const parent = ctx.users.parentA;
  const student = parent.students[0]!;
  await animateFlow("Parent A", log);
  log("Submitting booking…");
  const created = await createBookingPublic({
    userId: parent.id,
    slotId: slot.id,
    students: [studentPayload(ctx, student.id)],
  });
  log(`Created ${created.booking.reference} · ${created.booking.status}`, "success");
  log(`Reservation ${created.reservation?.status} · payment ${created.payment?.status}`);

  await apiJson("/api/payments/simulate/confirm", {
    method: "POST",
    body: JSON.stringify({
      userId: parent.id,
      bookingId: created.booking.id,
    }),
  });
  const after = await apiJson<BookingResponse>(
    `/api/bookings/${created.booking.id}?userId=${parent.id}`,
  );
  log(
    `After pay · booking ${after.booking.status} · reservation ${after.reservation?.status} · payment ${after.payment?.status}`,
    "success",
  );
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "booking CONFIRMED", pass: after.booking.status === "CONFIRMED" },
    {
      label: "reservation CONFIRMED",
      pass: after.reservation?.status === "CONFIRMED",
    },
    { label: "payment PAID", pass: after.payment?.status === "PAID" },
    { label: "available decreased by 1", pass: inv.available === 3 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Normal booking + payment OK" : "Normal booking assertions failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runLastSeat(
  ctx: DemoContext,
  log: LogFn,
  onUsers?: (users: Array<{ label: string; steps: string[]; outcome: string }>) => void,
): Promise<ScenarioResult> {
  const slot = await resetScenario("last-seat-race", log);
  const a = ctx.users.parentA;
  const b = ctx.users.parentB;
  await animateFlow("User A", log);
  await animateFlow("User B", log);
  onUsers?.([
    { label: "User A", steps: [...FLOW_STEPS], outcome: "Submitting…" },
    { label: "User B", steps: [...FLOW_STEPS], outcome: "Submitting…" },
  ]);
  log("Simultaneous booking submissions…");
  const results = await Promise.allSettled([
    createBookingPublic({
      userId: a.id,
      slotId: slot.id,
      students: [studentPayload(ctx, a.students[0]!.id)],
    }),
    createBookingPublic({
      userId: b.id,
      slotId: slot.id,
      students: [studentPayload(ctx, b.students[0]!.id)],
    }),
  ]);

  const okA = settledOk(results[0]!);
  const okB = settledOk(results[1]!);
  const errA = settledErr(results[0]!);
  const errB = settledErr(results[1]!);
  if (okA) log(`User A acquired ${okA.booking.reference}`, "success");
  if (errA) log(`User A failed: ${errA.code}`, "error");
  if (okB) log(`User B acquired ${okB.booking.reference}`, "success");
  if (errB) log(`User B failed: ${errB.code}`, "error");

  onUsers?.([
    {
      label: "User A",
      steps: [...FLOW_STEPS],
      outcome: okA ? "Reservation ✓" : `${errA?.code ?? "FAIL"}`,
    },
    {
      label: "User B",
      steps: [...FLOW_STEPS],
      outcome: okB ? "Reservation ✓" : `${errB?.code ?? "FAIL"}`,
    },
  ]);

  const inv = await fetchSlot(slot.id);
  const success = [okA, okB].filter(Boolean).length;
  const failed = [errA, errB].filter(Boolean).length;
  const assertions: Assertion[] = [
    { label: "exactly 1 success", pass: success === 1 },
    { label: "exactly 1 rejection", pass: failed === 1 },
    { label: "final available = 0", pass: inv.available === 0 },
    { label: "no overbooking", pass: inv.available >= 0 && success <= inv.capacity },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass
      ? `Last seat race OK · success=${success} rejected=${failed}`
      : "Last seat race failed invariants",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runHighConcurrency(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("high-concurrency", log);
  log("Preparing 20 stress actors…");
  const prepared = await apiJson<{
    actors: Array<{ label: string; userId: string; studentIds: string[] }>;
    catalog: {
      learningMethodId: string;
      levelId: string;
      gradeId: string;
      subjectIds: string[];
      slotId: string;
    };
  }>("/api/demo/trial-booking/concurrency/prepare", {
    method: "POST",
    body: JSON.stringify({ count: 20, childrenPerUser: 1 }),
  });
  log(`Prepared ${prepared.actors.length} users · concurrent submit…`);
  const results = await Promise.allSettled(
    prepared.actors.map((actor) =>
      createBookingPublic({
        userId: actor.userId,
        slotId: prepared.catalog.slotId,
        students: [
          {
            studentId: actor.studentIds[0],
            learningMethodId: prepared.catalog.learningMethodId,
            levelId: prepared.catalog.levelId,
            gradeId: prepared.catalog.gradeId,
            subjectIds: prepared.catalog.subjectIds,
            capabilityIds: [],
          },
        ],
      }),
    ),
  );
  let success = 0;
  let fail = 0;
  results.forEach((r, i) => {
    const label = prepared.actors[i]!.label;
    if (r.status === "fulfilled") {
      success += 1;
      log(`${label} ✓ RESERVED`, "success");
    } else {
      fail += 1;
      const err = settledErr(r);
      log(`${label} ✕ ${err?.code ?? "FAIL"}`, "error");
    }
  });
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "4 successes", pass: success === 4 },
    { label: "16 failures", pass: fail === 16 },
    { label: "available = 0", pass: inv.available === 0 },
    { label: "available >= 0", pass: inv.available >= 0 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass
      ? `Concurrency OK · ${success} reserved / ${fail} rejected`
      : "Concurrency invariants failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runMultiChild(
  ctx: DemoContext,
  log: LogFn,
  onUsers?: (users: Array<{ label: string; steps: string[]; outcome: string }>) => void,
): Promise<ScenarioResult> {
  const slot = await resetScenario("multi-child-race", log);
  await animateFlow("User A (2 children)", log);
  await animateFlow("User B (2 children)", log);
  const results = await Promise.allSettled([
    createBookingPublic({
      userId: ctx.users.parentA.id,
      slotId: slot.id,
      students: ctx.users.parentA.students
        .slice(0, 2)
        .map((s) => studentPayload(ctx, s.id)),
    }),
    createBookingPublic({
      userId: ctx.users.parentB.id,
      slotId: slot.id,
      students: ctx.users.parentB.students
        .slice(0, 2)
        .map((s) => studentPayload(ctx, s.id)),
    }),
  ]);
  const success = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.filter((r) => r.status === "rejected").length;
  results.forEach((r, i) => {
    const label = i === 0 ? "User A" : "User B";
    if (r.status === "fulfilled") log(`${label} reserved qty=2`, "success");
    else log(`${label} ${settledErr(r)?.code}`, "error");
  });
  onUsers?.([
    {
      label: "User A",
      steps: [...FLOW_STEPS],
      outcome: results[0]!.status === "fulfilled" ? "✓ qty 2" : "✕",
    },
    {
      label: "User B",
      steps: [...FLOW_STEPS],
      outcome: results[1]!.status === "fulfilled" ? "✓ qty 2" : "✕",
    },
  ]);
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "exactly one success", pass: success === 1 },
    { label: "exactly one failure", pass: fail === 1 },
    { label: "available = 1", pass: inv.available === 1 },
    { label: "no negative inventory", pass: inv.available >= 0 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Multi-child race OK" : "Multi-child race failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runDuplicate(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("duplicate-submission", log);
  const key = `dup-${Date.now()}`;
  const body = {
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    idempotencyKey: key,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  };
  log(`Duplicate submit with key ${key}…`);
  const results = await Promise.allSettled([
    createBookingPublic(body),
    createBookingPublic(body),
  ]);
  const fulfilled = results.filter(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<BookingResponse>[];
  const ids = new Set(fulfilled.map((r) => r.value.booking.id));
  log(`Responses: ${fulfilled.length} · unique bookings: ${ids.size}`);
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "both requests succeed (idempotent)", pass: fulfilled.length === 2 },
    { label: "one booking id", pass: ids.size === 1 },
    { label: "inventory decremented once", pass: inv.available === 3 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Idempotent duplicate OK" : "Idempotency failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runStale(ctx: DemoContext, log: LogFn): Promise<ScenarioResult> {
  const slot = await resetScenario("stale-availability", log);
  log(`User B UI shows available=${slot.available} (stale snapshot)`);
  const a = await createBookingPublic({
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  });
  log(`User A reserved ${a.booking.reference}`, "success");
  log("User B submits with stale available=1…");
  let code = "";
  try {
    await createBookingPublic({
      userId: ctx.users.parentB.id,
      slotId: slot.id,
      students: [studentPayload(ctx, ctx.users.parentB.students[0]!.id)],
    });
  } catch (err) {
    code = err instanceof ApiError ? err.code : "ERROR";
    log(`User B rejected: ${code} — Availability changed before submission.`, "error");
  }
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "stale submit SLOT_UNAVAILABLE", pass: code === "SLOT_UNAVAILABLE" },
    { label: "available = 0", pass: inv.available === 0 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Stale availability handled" : "Stale demo failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runExpiration(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("reservation-expiration", log);
  const created = await createBookingDemo({
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    ttlSeconds: 3,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  });
  log(`Reserved with TTL 3s · ${created.booking.reference}`);
  const mid = await fetchSlot(slot.id);
  log(`During hold available=${mid.available}`);
  log("Waiting for expiry…");
  await sleep(3500);
  await apiJson("/api/demo/trial-booking/expire", { method: "POST" });
  log("Expire job ran");
  const after = await apiJson<BookingResponse>(
    `/api/bookings/${created.booking.id}?userId=${ctx.users.parentA.id}`,
  );
  const inv = await fetchSlot(slot.id);
  log(
    `Booking ${after.booking.status} · reservation ${after.reservation?.status} · available ${inv.available}`,
  );
  const assertions: Assertion[] = [
    {
      label: "reservation EXPIRED",
      pass: after.reservation?.status === "EXPIRED",
    },
    {
      label: "booking EXPIRED",
      pass: after.booking.status === "EXPIRED",
    },
    { label: "inventory restored", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Expiration OK" : "Expiration failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runPayAfterExpire(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("payment-after-expiration", log);
  const created = await createBookingDemo({
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    ttlSeconds: 2,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  });
  await sleep(2500);
  await apiJson("/api/demo/trial-booking/expire", { method: "POST" });
  log("Reservation expired; attempting payment…");
  let payCode = "";
  try {
    await apiJson("/api/payments/simulate/confirm", {
      method: "POST",
      body: JSON.stringify({
        userId: ctx.users.parentA.id,
        bookingId: created.booking.id,
      }),
    });
  } catch (err) {
    payCode = err instanceof ApiError ? err.code : "ERROR";
    log(`Payment rejected: ${payCode}`, "error");
  }
  const after = await apiJson<BookingResponse>(
    `/api/bookings/${created.booking.id}?userId=${ctx.users.parentA.id}`,
  );
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "payment rejected", pass: payCode !== "" },
    { label: "booking not CONFIRMED", pass: after.booking.status !== "CONFIRMED" },
    { label: "inventory released", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Payment after expiration OK" : "Pay-after-expire failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runPayVsExpire(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("payment-vs-expiration", log);
  const created = await createBookingDemo({
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    ttlSeconds: 2,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  });
  await sleep(2100);
  log("Racing confirmPayment vs expireReservations…");
  const [payResult, expireResult] = await Promise.allSettled([
    apiJson("/api/payments/simulate/confirm", {
      method: "POST",
      body: JSON.stringify({
        userId: ctx.users.parentA.id,
        bookingId: created.booking.id,
      }),
    }),
    apiJson("/api/demo/trial-booking/expire", { method: "POST" }),
  ]);
  log(
    `Pay: ${payResult.status}${payResult.status === "rejected" ? ` ${(payResult.reason as ApiError).code}` : ""}`,
  );
  log(`Expire: ${expireResult.status}`);
  const after = await apiJson<BookingResponse>(
    `/api/bookings/${created.booking.id}?userId=${ctx.users.parentA.id}`,
  );
  const inv = await fetchSlot(slot.id);
  const terminal =
    after.reservation?.status === "CONFIRMED" ||
    after.reservation?.status === "EXPIRED";
  const both =
    after.reservation?.status === "CONFIRMED" &&
    after.booking.status === "EXPIRED";
  const assertions: Assertion[] = [
    { label: "exactly one terminal reservation state", pass: terminal && !both },
    {
      label: "inventory consistent",
      pass:
        (after.reservation?.status === "CONFIRMED" && inv.available === 0) ||
        (after.reservation?.status === "EXPIRED" && inv.available === 1),
    },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass
      ? `Race winner: ${after.reservation?.status}`
      : "Payment/expire race failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runCancelRace(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("cancellation-race", log);
  const created = await createBookingPublic({
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  });
  log("Concurrent double cancel…");
  const results = await Promise.all([
    apiJson<{ inventoryReleased: boolean }>(
      `/api/bookings/${created.booking.id}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ userId: ctx.users.parentA.id }),
      },
    ),
    apiJson<{ inventoryReleased: boolean }>(
      `/api/bookings/${created.booking.id}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ userId: ctx.users.parentA.id }),
      },
    ),
  ]);
  const released = results.filter((r) => r.inventoryReleased).length;
  log(`inventoryReleased count=${released}`);
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "released once", pass: released === 1 },
    { label: "available = 1", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Cancel race OK" : "Cancel race failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runSlotCancel(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("slot-cancellation", log);
  await apiJson(`/api/trial-class-slots/${slot.id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: "demo cancel" }),
  });
  log("Slot cancelled");
  let code = "";
  try {
    await createBookingPublic({
      userId: ctx.users.parentA.id,
      slotId: slot.id,
      students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
    });
  } catch (err) {
    code = err instanceof ApiError ? err.code : "ERROR";
    log(`Booking rejected: ${code}`, "error");
  }
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    {
      label: "booking rejected",
      pass: code === "SLOT_CANCELLED" || code === "SLOT_UNAVAILABLE",
    },
    { label: "available unchanged", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Slot cancellation OK" : "Slot cancel demo failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runInactiveConfig(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("invalid-configuration", log);
  await apiJson(`/api/levels/${ctx.catalog.level.id}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  });
  log("Level deactivated");
  let code = "";
  try {
    await createBookingPublic({
      userId: ctx.users.parentA.id,
      slotId: slot.id,
      students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
    });
  } catch (err) {
    code = err instanceof ApiError ? err.code : "ERROR";
    log(`Booking rejected: ${code}`, "error");
  }
  await apiJson(`/api/levels/${ctx.catalog.level.id}`, {
    method: "PATCH",
    body: JSON.stringify({ active: true }),
  });
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    { label: "rejected inactive level", pass: code === "INVALID_LEVEL" || code === "VALIDATION_ERROR" || code.length > 0 },
    { label: "inventory unchanged", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Inactive config OK" : "Inactive config failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runInvalidRel(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("invalid-relationship", log);
  // Fetch another grade under same level if exists via grades list — use bogus by swapping subject without level link: use grade from wrong level by creating invalid gradeId = learningMethodId
  let code = "";
  try {
    await createBookingPublic({
      userId: ctx.users.parentA.id,
      slotId: slot.id,
      students: [
        studentPayload(ctx, ctx.users.parentA.students[0]!.id, {
          gradeId: ctx.catalog.learningMethod.id,
        }),
      ],
    });
  } catch (err) {
    code = err instanceof ApiError ? err.code : "ERROR";
    log(`Rejected invalid grade: ${code}`, "error");
  }
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    {
      label: "validation/relationship error",
      pass:
        code === "INVALID_GRADE" ||
        code === "VALIDATION_ERROR" ||
        code === "NOT_FOUND",
    },
    { label: "inventory unchanged", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Invalid relationship OK" : "Invalid relationship failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runOwnership(
  ctx: DemoContext,
  log: LogFn,
): Promise<ScenarioResult> {
  const slot = await resetScenario("child-ownership", log);
  let code = "";
  try {
    await createBookingPublic({
      userId: ctx.users.parentB.id,
      slotId: slot.id,
      students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
    });
  } catch (err) {
    code = err instanceof ApiError ? err.code : "ERROR";
    log(`Ownership rejected: ${code}`, "error");
  }
  const inv = await fetchSlot(slot.id);
  const assertions: Assertion[] = [
    {
      label: "STUDENT_NOT_OWNED",
      pass: code === "STUDENT_NOT_OWNED" || code === "FORBIDDEN",
    },
    { label: "inventory unchanged", pass: inv.available === 1 },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Ownership enforced" : "Ownership demo failed",
    assertions,
    inventory: { capacity: inv.capacity, available: inv.available },
  };
}

async function runRoster(ctx: DemoContext, log: LogFn): Promise<ScenarioResult> {
  const slot = await resetScenario("roster", log);
  const created = await createBookingPublic({
    userId: ctx.users.parentA.id,
    slotId: slot.id,
    students: [studentPayload(ctx, ctx.users.parentA.students[0]!.id)],
  });
  await apiJson("/api/payments/simulate/confirm", {
    method: "POST",
    body: JSON.stringify({
      userId: ctx.users.parentA.id,
      bookingId: created.booking.id,
    }),
  });
  log("Confirmed booking; fetching roster…");
  const roster = await apiJson<SlotRoster>(
    `/api/trial-class-slots/${slot.id}/roster`,
  );
  log(
    `Roster rows=${roster.entries.length} confirmed=${roster.counts.confirmed} available=${roster.slot.available}`,
  );
  const assertions: Assertion[] = [
    { label: "at least one roster row", pass: roster.entries.length >= 1 },
    { label: "confirmed count >= 1", pass: roster.counts.confirmed >= 1 },
    {
      label: "reference present",
      pass: roster.entries.some(
        (e) => e.bookingReference === created.booking.reference,
      ),
    },
    {
      label: "counts consistent with capacity",
      pass:
        roster.slot.available + roster.counts.seatsHeld <= roster.slot.capacity,
    },
  ];
  const pass = assertions.every((a) => a.pass);
  return {
    pass,
    summary: pass ? "Roster OK" : "Roster assertions failed",
    assertions,
    inventory: {
      capacity: roster.slot.capacity,
      available: roster.slot.available,
    },
  };
}

export type { LogEntry };
