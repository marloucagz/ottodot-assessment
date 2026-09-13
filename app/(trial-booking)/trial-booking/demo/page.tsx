"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  apiJson,
  type BookingResponse,
  type DemoContext,
} from "../../_components/api";
import { EventLog, type LogEntry } from "../../_components/EventLog";
import {
  Btn,
  InventoryStrip,
  Panel,
  PassFailBanner,
} from "../../_components/ui";
import {
  SCENARIO_META,
  runScenario,
  type ScenarioResult,
} from "../../_components/scenarios";
import { TrialBookingWizard } from "../../_components/wizard/TrialBookingWizard";
import type { TrialBookingWizardApi } from "../../_components/wizard/useTrialBookingWizard";

export default function TrialBookingDemoPage() {
  const [ctx, setCtx] = useState<DemoContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("last-seat-race");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const apiA = useRef<TrialBookingWizardApi | null>(null);
  const apiB = useRef<TrialBookingWizardApi | null>(null);

  const log = useCallback((message: string, level: LogEntry["level"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { id: prev.length + 1, at: new Date(), level, message },
    ]);
  }, []);

  const loadCtx = useCallback(async () => {
    try {
      const data = await apiJson<DemoContext>(
        "/api/demo/trial-booking/context",
      );
      setCtx(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.code}: ${err.message}`
          : "Failed to load context. Seed at /trial-booking/seed first.",
      );
    }
  }, []);

  useEffect(() => {
    void loadCtx();
  }, [loadCtx]);

  const slotForScenario = ctx
    ? activeId === "multi-child-race"
      ? ctx.slots.multiChild
      : activeId === "high-concurrency" ||
          activeId === "normal" ||
          activeId === "duplicate-submission" ||
          activeId === "roster"
        ? ctx.slots.happyPath
        : activeId.startsWith("reservation") ||
            activeId.startsWith("payment")
          ? ctx.slots.expiration
          : ctx.slots.lastSeat
    : null;

  async function onReset() {
    if (!ctx) return;
    setBusy(true);
    setResult(null);
    setLogs([]);
    try {
      await apiJson(
        `/api/demo/trial-booking/scenarios/${activeId}/reset`,
        { method: "POST" },
      );
      log(`Scenario ${activeId} reset`, "success");
      await loadCtx();
      setWizardKey((k) => k + 1);
    } catch (err) {
      log(`Reset failed · ${err instanceof Error ? err.message : "error"}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onRunAutomated() {
    if (!ctx) return;
    setBusy(true);
    setResult(null);
    setLogs([]);
    try {
      const outcome = await runScenario(activeId, ctx, log);
      setResult(outcome);
      await loadCtx();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Run failed";
      log(msg, "error");
      setResult({ pass: false, summary: msg, assertions: [] });
    } finally {
      setBusy(false);
    }
  }

  async function onStartRace() {
    const a = apiA.current;
    const b = apiB.current;
    if (!a || !b) return;
    if (a.state.step !== "review" || b.state.step !== "review") {
      log("Both users must be on Review before Start race", "error");
      return;
    }
    setBusy(true);
    setResult(null);
    log("Start race · concurrent POST /api/bookings");
    const [ra, rb] = await Promise.allSettled([
      a.submitBooking(),
      b.submitBooking(),
    ]);
    const okA =
      ra.status === "fulfilled" && ra.value.ok ? ra.value.booking : null;
    const okB =
      rb.status === "fulfilled" && rb.value.ok ? rb.value.booking : null;
    const failA =
      ra.status === "fulfilled" && !ra.value.ok
        ? ra.value
        : ra.status === "rejected"
          ? { code: "ERROR", message: String(ra.reason) }
          : null;
    const failB =
      rb.status === "fulfilled" && !rb.value.ok
        ? rb.value
        : rb.status === "rejected"
          ? { code: "ERROR", message: String(rb.reason) }
          : null;

    if (okA) {
      const bookings =
        ra.status === "fulfilled" && ra.value.ok
          ? ra.value.bookings
          : [okA as BookingResponse];
      a.applyBookingResult(bookings);
      log(`User A reserved ${bookings.map((b) => b.booking.reference).join(", ")}`, "success");
    } else if (failA && "code" in failA) {
      a.applyFailure(failA.code ?? "ERROR", failA.message ?? "failed");
      log(`User A ${failA.code}`, "error");
    }
    if (okB) {
      const bookings =
        rb.status === "fulfilled" && rb.value.ok
          ? rb.value.bookings
          : [okB as BookingResponse];
      b.applyBookingResult(bookings);
      log(`User B reserved ${bookings.map((x) => x.booking.reference).join(", ")}`, "success");
    } else if (failB && "code" in failB) {
      b.applyFailure(failB.code ?? "ERROR", failB.message ?? "failed");
      log(`User B ${failB.code}`, "error");
    }

    await loadCtx();
    const slotId = slotForScenario?.id;
    let inventory: { capacity: number; available: number } | undefined;
    if (slotId) {
      try {
        const live = await apiJson<{ capacity: number; available: number }>(
          `/api/trial-class-slots/${slotId}`,
        );
        inventory = { capacity: live.capacity, available: live.available };
      } catch {
        inventory = slotForScenario
          ? {
              capacity: slotForScenario.capacity,
              available: slotForScenario.available,
            }
          : undefined;
      }
    }
    const available = inventory?.available ?? -1;
    const success = [okA, okB].filter(Boolean).length;
    const failed = [failA, failB].filter(Boolean).length;
    const assertions =
      activeId === "last-seat-race"
        ? [
            { label: "exactly 1 success (last seat)", pass: success === 1 },
            { label: "exactly 1 rejection", pass: failed === 1 },
            { label: "available never negative", pass: available >= 0 },
            { label: "final available = 0", pass: available === 0 },
          ]
        : activeId === "multi-child-race"
          ? [
              {
                label: "both reservations succeed (2 seats)",
                pass: success === 2,
              },
              { label: "available never negative", pass: available >= 0 },
              { label: "final available = 0", pass: available === 0 },
            ]
          : [
              { label: "available never negative", pass: available >= 0 },
            ];
    const pass = assertions.every((x) => x.pass);
    setResult({
      pass,
      summary: pass
        ? `Race complete · success=${success} rejected=${failed}`
        : "Race assertions failed",
      assertions,
      inventory,
    });
    setBusy(false);
  }

  if (!ctx && !error) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 text-[13px] text-[#6b7280]">
        Loading demo context…
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="space-y-1">
        <p className="text-[12px] font-medium uppercase tracking-wide text-[#6b7280]">
          Engineering demo
        </p>
        <h1 className="text-[18px] font-semibold">
          Trial booking concurrency demo
        </h1>
        <p className="text-[13px] text-[#6b7280]">
          Two parents independently go through the same booking flow. The
          engineering panel below shows race outcomes.
        </p>
        {error ? (
          <p className="text-[13px] text-[#c81e1e]" role="alert">
            {error}
          </p>
        ) : null}
      </header>

      {ctx ? (
        <section className="space-y-3">
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#6b7280]">
            Customer experience
          </h2>
          <p className="text-[13px] text-[#6b7280]">
            Two parents are attempting to book the same available class.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[13px] font-medium">User A</h3>
              <TrialBookingWizard
                key={`a-${wizardKey}`}
                ctx={ctx}
                parent={ctx.users.parentA}
                parentKey="parentA"
                defaultSlotId={slotForScenario?.id}
                compact
                showSummary={false}
                audience="demo"
                onLog={(m, l) => log(`User A · ${m}`, l)}
                apiRef={apiA}
              />
            </div>
            <div>
              <h3 className="mb-2 text-[13px] font-medium">User B</h3>
              <TrialBookingWizard
                key={`b-${wizardKey}`}
                ctx={ctx}
                parent={ctx.users.parentB}
                parentKey="parentB"
                defaultSlotId={slotForScenario?.id}
                compact
                showSummary={false}
                audience="demo"
                onLog={(m, l) => log(`User B · ${m}`, l)}
                apiRef={apiB}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border border-[#e5e7eb] bg-white p-4">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#6b7280]">
          Engineering results
        </h2>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_META.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => {
                setActiveId(s.id);
                setResult(null);
              }}
              className={`rounded-full px-2.5 py-1 text-[12px] ${
                activeId === s.id
                  ? "bg-[#ecfdf5] font-medium text-[#166534]"
                  : "bg-white text-[#6b7280] ring-1 ring-[#e5e7eb]"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {ctx && slotForScenario ? (
          <InventoryStrip
            label={slotForScenario.label}
            capacity={slotForScenario.capacity}
            available={slotForScenario.available}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Btn disabled={busy || !ctx} variant="secondary" onClick={() => void onReset()}>
            Reset scenario
          </Btn>
          <Btn disabled={busy || !ctx} onClick={() => void onStartRace()}>
            {busy ? "Racing…" : "Start booking race"}
          </Btn>
          <Btn
            disabled={busy || !ctx}
            variant="secondary"
            onClick={() => void onRunAutomated()}
          >
            Run automated scenario
          </Btn>
        </div>

        <EventLog logs={logs} />

        {result ? (
          <Panel title="Assertions">
            <PassFailBanner pass={result.pass} summary={result.summary} />
            {result.inventory ? (
              <p className="mt-2 text-[13px] text-[#6b7280]">
                Final inventory: available {result.inventory.available} / capacity{" "}
                {result.inventory.capacity}
              </p>
            ) : null}
            <ul className="mt-2 space-y-1 text-[13px]">
              {result.assertions.map((a, i) => (
                <li
                  key={`assert-${i}-${a.label}`}
                  className={a.pass ? "text-[#3c8c6c]" : "text-[#c81e1e]"}
                >
                  {a.pass ? "✓" : "✕"} {a.label}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {activeId === "roster" && ctx ? (
          <RosterPreview slotId={ctx.slots.happyPath.id} />
        ) : null}
      </section>
    </main>
  );
}

function RosterPreview({ slotId }: { slotId: string }) {
  const [rows, setRows] = useState("Load roster after a confirmed booking.");
  return (
    <Panel title="Trial class roster">
      <Btn
        variant="secondary"
        onClick={() => {
          void (async () => {
            try {
              const data = await apiJson<{
                slot: { capacity: number; available: number };
                counts: {
                  confirmed: number;
                  reserved: number;
                  seatsHeld: number;
                };
                entries: Array<{
                  child: { firstName: string };
                  grade: string;
                  subjects: string[];
                  bookingStatus: string;
                  paymentStatus: string | null;
                }>;
              }>(`/api/trial-class-slots/${slotId}/roster`);
              setRows(
                [
                  `Capacity ${data.slot.capacity} · Available ${data.slot.available} · Confirmed ${data.counts.confirmed} · Reserved ${data.counts.reserved}`,
                  ...data.entries.map(
                    (e) =>
                      `${e.child.firstName} · ${e.grade} · ${e.subjects.join(", ")} · ${e.bookingStatus} · ${e.paymentStatus ?? "—"}`,
                  ),
                ].join("\n"),
              );
            } catch (err) {
              setRows(err instanceof Error ? err.message : "Failed");
            }
          })();
        }}
      >
        Refresh roster from server
      </Btn>
      <pre className="mt-2 whitespace-pre-wrap text-[12px] text-[#6b7280]">
        {rows}
      </pre>
    </Panel>
  );
}
