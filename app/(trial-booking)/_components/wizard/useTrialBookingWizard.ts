"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  apiJson,
  PAYMENT_CHANNEL,
  type BookingResponse,
  type DemoContext,
  type ParentCtx,
  type QuoteResponse,
} from "../api";
import { customerError } from "./customerCopy";
import {
  WIZARD_STEPS,
  combineQuotes,
  selectedSubjectIds,
  type ListedSlot,
  type WizardAudience,
  type WizardParent,
  type WizardState,
  type WizardStepId,
  type WizardStudent,
} from "./types";

function parentFromCtx(p: ParentCtx): WizardParent {
  return {
    userId: p.id,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    email: p.email,
    phone: p.phone ?? "",
  };
}

function catalogSubjects(ctx: DemoContext) {
  if (ctx.catalog.subjectList?.length) return ctx.catalog.subjectList;
  return [ctx.catalog.subjects.math, ctx.catalog.subjects.science];
}

function defaultStudent(ctx: DemoContext, studentId: string): WizardStudent {
  const subjects = catalogSubjects(ctx);
  const allowed = subjects.filter((s) =>
    (ctx.catalog.levelSubjectIds ?? []).includes(s.id),
  );
  const ids = (allowed.length ? allowed : subjects).map((s) => s.id);
  return {
    studentId,
    learningMethodId: ctx.catalog.learningMethod.id,
    levelId: ctx.catalog.level.id,
    gradeId: ctx.catalog.grade.id,
    subjectIds: ids,
    capabilityIds: [],
  };
}

export function toListedSlot(row: {
  id: string;
  capacity: number;
  available: number;
  startsAt: string | Date;
  endsAt: string | Date;
  timezone: string;
  active: boolean;
  cancelledAt?: string | Date | null;
  schedule?: { name: string; timezone: string } | null;
}): ListedSlot {
  return {
    id: row.id,
    capacity: row.capacity,
    available: row.available,
    startsAt:
      typeof row.startsAt === "string"
        ? row.startsAt
        : new Date(row.startsAt).toISOString(),
    endsAt:
      typeof row.endsAt === "string"
        ? row.endsAt
        : new Date(row.endsAt).toISOString(),
    timezone: row.timezone,
    active: row.active,
    cancelledAt: row.cancelledAt
      ? typeof row.cancelledAt === "string"
        ? row.cancelledAt
        : new Date(row.cancelledAt).toISOString()
      : null,
    schedule: row.schedule ?? null,
  };
}

function friendly(err: unknown) {
  if (err instanceof ApiError) return customerError(err.code, err.message);
  return customerError(undefined);
}

function emptyState(
  ctx: DemoContext,
  parent: ParentCtx,
): WizardState {
  return {
    step: "parent",
    parent: parentFromCtx(parent),
    slotBySubjectId: {},
    students: parent.students[0]
      ? [defaultStudent(ctx, parent.students[0].id)]
      : [],
    quotes: [],
    bookings: [],
    error: null,
    errorCode: null,
    busy: false,
  };
}

export function useTrialBookingWizard(opts: {
  ctx: DemoContext;
  parent: ParentCtx;
  defaultSlotId?: string;
  compact?: boolean;
  audience?: WizardAudience;
  onLog?: (message: string, level?: "info" | "success" | "error") => void;
}) {
  const { ctx, parent, defaultSlotId, onLog } = opts;
  const audience = opts.audience ?? "customer";
  const [listedSlots, setListedSlots] = useState<ListedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [state, setState] = useState<WizardState>(() => emptyState(ctx, parent));
  const maxReached = useRef(0);
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === state.step);

  const refreshSlots = useCallback(async () => {
    try {
      const rows = await apiJson<
        Array<{
          id: string;
          capacity: number;
          available: number;
          startsAt: string;
          endsAt: string;
          timezone: string;
          active: boolean;
          cancelledAt: string | null;
          schedule?: { name: string; timezone: string } | null;
        }>
      >("/api/trial-class-slots?active=true", { cache: "no-store" });
      setListedSlots(rows.map(toListedSlot));
    } catch {
      setListedSlots((prev) => {
        if (prev.length > 0) return prev;
        return Object.values(ctx.slots)
          .filter((s) => s.startsAt && s.endsAt)
          .map((s) =>
            toListedSlot({
              id: s.id,
              capacity: s.capacity,
              available: s.available,
              startsAt: s.startsAt!,
              endsAt: s.endsAt!,
              timezone: s.timezone,
              active: s.active,
              cancelledAt: s.cancelledAt,
            }),
          );
      });
    } finally {
      setSlotsLoading(false);
    }
  }, [ctx.slots]);

  useEffect(() => {
    setSlotsLoading(true);
    void refreshSlots();
  }, [refreshSlots]);

  useEffect(() => {
    if (state.step !== "class") return;
    void refreshSlots();
  }, [state.step, refreshSlots]);

  const subjectIds = selectedSubjectIds(state.students);

  const slot = useMemo(() => {
    const firstId = subjectIds
      .map((id) => state.slotBySubjectId[id])
      .find(Boolean);
    if (!firstId) return listedSlots[0] ?? null;
    return listedSlots.find((s) => s.id === firstId) ?? null;
  }, [listedSlots, state.slotBySubjectId, subjectIds]);

  const quote = combineQuotes(state.quotes);
  const booking = state.bookings[0] ?? null;

  const setError = useCallback(
    (error: string | null, errorCode: string | null = null) => {
      setState((prev) => ({ ...prev, error, errorCode }));
    },
    [],
  );

  const goTo = useCallback((step: WizardStepId) => {
    const target = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (target < 0) return;
    setState((prev) => {
      const current = WIZARD_STEPS.findIndex((s) => s.id === prev.step);
      if (target > current && target > maxReached.current) return prev;
      if (target > maxReached.current && step !== "parent") return prev;
      return { ...prev, step, error: null, errorCode: null };
    });
  }, []);

  const validateParent = useCallback((p: WizardParent) => {
    const errors: Record<string, string> = {};
    if (!p.firstName.trim()) errors.firstName = "First name is required";
    if (!p.lastName.trim()) errors.lastName = "Last name is required";
    if (!p.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
      errors.email = "Enter a valid email";
    }
    return errors;
  }, []);

  function validateStudent(s: WizardState) {
    if (s.students.length === 0) return "Please add at least one child.";
    for (const st of s.students) {
      if (!st.studentId) return "Please select your child.";
      if (!st.learningMethodId || !st.levelId || !st.gradeId) {
        return "Please complete learning method, level, and grade for each child.";
      }
      if (st.subjectIds.length === 0) {
        return "Please choose at least one subject for each child.";
      }
    }
    const ids = s.students.map((st) => st.studentId);
    if (new Set(ids).size !== ids.length) {
      return "Each child can only be added once.";
    }
    return null;
  }

  function validateClassPick(s: WizardState) {
    const ids = selectedSubjectIds(s.students);
    if (ids.length === 0) return "Please choose at least one subject first.";
    for (const id of ids) {
      if (!s.slotBySubjectId[id]) {
        return "Please choose a trial class for each selected subject.";
      }
    }
    const slotIds = ids.map((id) => s.slotBySubjectId[id]!);
    if (new Set(slotIds).size !== slotIds.length) {
      return "Please choose a different class time for each subject.";
    }
    return null;
  }

  function buildSubjectPayloads(s: WizardState = state) {
    const ids = selectedSubjectIds(s.students);
    return ids.map((subjectId) => ({
      subjectId,
      slotId: s.slotBySubjectId[subjectId]!,
      userId: s.parent.userId,
      students: s.students
        .filter((st) => st.subjectIds.includes(subjectId))
        .map((st) => ({
          studentId: st.studentId,
          learningMethodId: st.learningMethodId,
          levelId: st.levelId,
          gradeId: st.gradeId,
          subjectIds: [subjectId],
          capabilityIds: st.capabilityIds,
        })),
    }));
  }

  async function persistParent() {
    const p = state.parent;
    await apiJson(`/api/users/${p.userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        email: p.email.trim(),
        phone: p.phone.trim() || null,
      }),
    });
  }

  async function next() {
    setError(null);
    if (state.step === "parent") {
      const errors = validateParent(state.parent);
      if (Object.keys(errors).length) {
        setError(Object.values(errors)[0] ?? "Please check your details.");
        return errors;
      }
      setState((prev) => ({ ...prev, busy: true }));
      try {
        await persistParent();
        onLog?.(`Parent saved · ${state.parent.email}`);
        maxReached.current = Math.max(maxReached.current, 1);
        setState((prev) => ({
          ...prev,
          step: "student",
          busy: false,
          error: null,
          errorCode: null,
        }));
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "ERROR";
        setState((prev) => ({
          ...prev,
          busy: false,
          error: friendly(err),
          errorCode: code,
        }));
      }
      return errors;
    }
    if (state.step === "student") {
      const msg = validateStudent(state);
      if (msg) {
        setError(msg);
        return;
      }
      maxReached.current = Math.max(maxReached.current, 2);
      setState((prev) => ({ ...prev, step: "class", error: null }));
      return;
    }
    if (state.step === "class") {
      const msg = validateClassPick(state);
      if (msg) {
        setError(msg);
        return;
      }
      maxReached.current = Math.max(maxReached.current, 3);
      setState((prev) => ({ ...prev, step: "preferences", error: null }));
      return;
    }
    if (state.step === "preferences") {
      await refreshQuote();
    }
  }

  function back() {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === state.step);
    if (idx <= 0) return;
    setState((prev) => ({
      ...prev,
      step: WIZARD_STEPS[idx - 1]!.id,
      error: null,
      errorCode: null,
    }));
  }

  async function refreshQuote() {
    const payloads = buildSubjectPayloads();
    if (payloads.some((p) => p.students.length === 0 || !p.slotId)) {
      setError("Please choose a trial class for each selected subject.");
      return;
    }
    setState((prev) => ({ ...prev, busy: true, error: null, errorCode: null }));
    try {
      const quotes: QuoteResponse[] = [];
      for (const payload of payloads) {
        quotes.push(
          await apiJson<QuoteResponse>("/api/bookings/quote", {
            method: "POST",
            body: JSON.stringify({
              userId: payload.userId,
              slotId: payload.slotId,
              students: payload.students,
            }),
          }),
        );
      }
      maxReached.current = Math.max(maxReached.current, 4);
      setState((prev) => ({
        ...prev,
        quotes,
        busy: false,
        step: "review",
      }));
      onLog?.(`Quoted ${quotes.length} class(es)`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "ERROR";
      setState((prev) => ({
        ...prev,
        busy: false,
        error: friendly(err),
        errorCode: code,
      }));
      onLog?.(`${code}`, "error");
    }
  }

  async function submitBooking(idempotencyKey?: string) {
    const payloads = buildSubjectPayloads();
    setState((prev) => ({ ...prev, busy: true, error: null, errorCode: null }));
    onLog?.("Submitting booking…");
    const bookings: BookingResponse[] = [];
    try {
      for (const [i, payload] of payloads.entries()) {
        const booking = await apiJson<BookingResponse>("/api/bookings", {
          method: "POST",
          body: JSON.stringify({
            userId: payload.userId,
            slotId: payload.slotId,
            students: payload.students,
            ...(idempotencyKey ? { idempotencyKey: `${idempotencyKey}-${i}` } : {}),
          }),
        });
        bookings.push(booking);
      }
      maxReached.current = Math.max(maxReached.current, 5);
      setState((prev) => ({
        ...prev,
        bookings,
        busy: false,
        step: "payment",
      }));
      onLog?.(
        `Reserved ${bookings.map((b) => b.booking.reference).join(", ")}`,
        "success",
      );
      return { ok: true as const, booking: bookings[0]!, bookings };
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "ERROR";
      const msg = friendly(err);
      setState((prev) => ({
        ...prev,
        busy: false,
        error: msg,
        errorCode: code,
      }));
      onLog?.(`${code}`, "error");
      return {
        ok: false as const,
        code,
        message: msg,
        booking: bookings[0],
        bookings,
      };
    }
  }

  async function refreshBooking() {
    const ids = state.bookings.map((b) => b.booking.id);
    const userId = state.parent.userId;
    if (ids.length === 0) return null;
    const bookings = await Promise.all(
      ids.map((id) =>
        apiJson<BookingResponse>(
          `/api/bookings/${id}?userId=${encodeURIComponent(userId)}`,
        ),
      ),
    );
    const paid = bookings.every(
      (b) =>
        b.booking.status === "CONFIRMED" || b.payment?.status === "PAID",
    );
    const expired = bookings.some(
      (b) =>
        b.booking.status === "EXPIRED" || b.reservation?.status === "EXPIRED",
    );
    if (paid) maxReached.current = Math.max(maxReached.current, 6);
    setState((prev) => ({
      ...prev,
      bookings,
      step: paid ? "confirmation" : prev.step,
      error: expired ? customerError("RESERVATION_EXPIRED") : prev.error,
      errorCode: expired ? "RESERVATION_EXPIRED" : prev.errorCode,
    }));
    return bookings[0] ?? null;
  }

  useEffect(() => {
    if (state.step !== "payment" || state.bookings.length === 0) return;
    const ids = state.bookings.map((b) => b.booking.id);
    const userId = state.parent.userId;
    const load = () =>
      Promise.all(
        ids.map((id) =>
          apiJson<BookingResponse>(
            `/api/bookings/${id}?userId=${encodeURIComponent(userId)}`,
          ),
        ),
      ).then((bookings) => {
        setState((prev) => {
          const paid = bookings.every(
            (b) =>
              b.booking.status === "CONFIRMED" || b.payment?.status === "PAID",
          );
          if (paid) maxReached.current = Math.max(maxReached.current, 6);
          const expired = bookings.some(
            (b) =>
              b.booking.status === "EXPIRED" ||
              b.reservation?.status === "EXPIRED",
          );
          return {
            ...prev,
            bookings,
            step: paid ? "confirmation" : prev.step,
            error: expired ? customerError("RESERVATION_EXPIRED") : prev.error,
            errorCode: expired ? "RESERVATION_EXPIRED" : prev.errorCode,
          };
        });
      });

    const poll = window.setInterval(() => void load(), 2000);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(PAYMENT_CHANNEL);
      channel.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { bookingId?: string };
        if (!data?.bookingId || !ids.includes(data.bookingId)) return;
        void load();
      };
    } catch {
      /* ignore */
    }
    return () => {
      window.clearInterval(poll);
      channel?.close();
    };
  }, [state.step, state.bookings.map((b) => b.booking.id).join(","), state.parent.userId]);

  function openPaymentTab() {
    if (state.bookings.length === 0) return;
    const ids = state.bookings.map((b) => b.booking.id);
    const url = `/trial-booking/payment/${ids[0]}?userId=${encodeURIComponent(state.parent.userId)}&ids=${ids.join(",")}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onLog?.("Opened payment tab");
  }

  function updateParent(patch: Partial<WizardParent>) {
    setState((prev) => ({ ...prev, parent: { ...prev.parent, ...patch } }));
  }

  function setSlotForSubject(subjectId: string, slotId: string) {
    setState((prev) => {
      const taken = Object.entries(prev.slotBySubjectId).some(
        ([sid, id]) => sid !== subjectId && id === slotId,
      );
      if (taken) {
        return {
          ...prev,
          error: "Please choose a different class time for each subject.",
          errorCode: null,
        };
      }
      return {
        ...prev,
        slotBySubjectId: { ...prev.slotBySubjectId, [subjectId]: slotId },
        quotes: [],
        error: null,
      };
    });
  }

  function updateStudent(index: number, patch: Partial<WizardStudent>) {
    setState((prev) => {
      const students = prev.students.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      const keep = new Set(selectedSubjectIds(students));
      const slotBySubjectId = Object.fromEntries(
        Object.entries(prev.slotBySubjectId).filter(([id]) => keep.has(id)),
      );
      return { ...prev, students, slotBySubjectId, quotes: [] };
    });
  }

  function addStudent() {
    const used = new Set(state.students.map((s) => s.studentId));
    const nextChild = parent.students.find((s) => !used.has(s.id));
    if (!nextChild) return;
    setState((prev) => ({
      ...prev,
      students: [...prev.students, defaultStudent(ctx, nextChild.id)],
      quotes: [],
    }));
  }

  function removeStudent(index: number) {
    setState((prev) => {
      const students = prev.students.filter((_, i) => i !== index);
      const keep = new Set(selectedSubjectIds(students));
      const slotBySubjectId = Object.fromEntries(
        Object.entries(prev.slotBySubjectId).filter(([id]) => keep.has(id)),
      );
      return { ...prev, students, slotBySubjectId, quotes: [] };
    });
  }

  function resetWizard() {
    maxReached.current = 0;
    setState(emptyState(ctx, parent));
    void refreshSlots();
  }

  function chooseAnotherClass() {
    maxReached.current = Math.max(maxReached.current, 2);
    setState((prev) => ({
      ...prev,
      step: "class",
      bookings: [],
      quotes: [],
      error: null,
      errorCode: null,
      busy: false,
    }));
    void refreshSlots();
  }

  function applyBookingResult(result: BookingResponse | BookingResponse[]) {
    const bookings = Array.isArray(result) ? result : [result];
    maxReached.current = Math.max(maxReached.current, 5);
    setState((prev) => ({ ...prev, bookings, step: "payment", busy: false }));
  }

  function applyFailure(code: string, message: string) {
    setState((prev) => ({
      ...prev,
      error: customerError(code, message),
      errorCode: code,
      busy: false,
    }));
  }

  const earliestExpiry = state.bookings
    .map((b) => b.reservation?.expiresAt)
    .filter((v): v is string => Boolean(v))
    .sort()[0];

  return {
    state,
    slot,
    quote,
    booking,
    listedSlots,
    slotsLoading,
    subjectIds,
    defaultSlotId,
    earliestExpiry,
    stepIndex,
    maxReached: maxReached.current,
    compact: opts.compact,
    audience,
    goTo,
    next,
    back,
    validateParent,
    refreshQuote,
    submitBooking,
    refreshBooking,
    openPaymentTab,
    updateParent,
    setSlotForSubject,
    updateStudent,
    addStudent,
    removeStudent,
    resetWizard,
    chooseAnotherClass,
    applyBookingResult,
    applyFailure,
    setError,
  };
}

export type TrialBookingWizardApi = ReturnType<typeof useTrialBookingWizard>;
