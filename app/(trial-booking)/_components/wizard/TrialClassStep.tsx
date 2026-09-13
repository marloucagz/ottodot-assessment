"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogItem, DemoContext } from "../api";
import { Btn } from "../ui";
import { catalogSubjectList } from "./catalog";
import {
  COPY,
  formatClassDate,
  formatClassTime,
  seatsLabel,
} from "./customerCopy";
import { selectedSubjectIds } from "./types";
import type { TrialBookingWizardApi } from "./useTrialBookingWizard";

function dateKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function TrialClassStep({
  ctx,
  api,
}: {
  ctx: DemoContext;
  api: TrialBookingWizardApi;
}) {
  const {
    listedSlots,
    slotsLoading,
    state,
    setSlotForSubject,
    next,
    back,
    defaultSlotId,
  } = api;
  const catalog = catalogSubjectList(ctx);
  const subjectIds = selectedSubjectIds(state.students);
  const subjects = catalog.filter((s) => subjectIds.includes(s.id));
  const [activeSubjectId, setActiveSubjectId] = useState(
    subjects[0]?.id ?? "",
  );

  useEffect(() => {
    if (!subjects.some((s) => s.id === activeSubjectId) && subjects[0]) {
      setActiveSubjectId(subjects[0].id);
    }
  }, [subjects, activeSubjectId]);

  const tz = listedSlots[0]?.timezone ?? "Asia/Singapore";
  const now = Date.now();

  const openSlots = listedSlots.filter(
    (s) => s.active && !s.cancelledAt && new Date(s.endsAt).getTime() > now,
  );

  const nearest = useMemo(() => {
    const upcoming = openSlots
      .filter((s) => s.available > 0 && new Date(s.startsAt).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    const focused =
      (defaultSlotId
        ? upcoming.find((s) => s.id === defaultSlotId)
        : undefined) ?? upcoming[0];
    return focused ?? null;
  }, [openSlots, defaultSlotId, now]);

  const [cursor, setCursor] = useState(() => {
    const key = dateKey(new Date().toISOString(), "Asia/Singapore");
    const [y, m] = key.split("-").map(Number);
    return { year: y!, month: m! - 1 };
  });
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  useEffect(() => {
    const selectedId = state.slotBySubjectId[activeSubjectId];
    const selected = listedSlots.find((s) => s.id === selectedId);
    const focus = selected ?? nearest;
    if (!focus) return;
    const key = dateKey(focus.startsAt, focus.timezone || tz);
    const [y, m] = key.split("-").map(Number);
    setCursor({ year: y!, month: m! - 1 });
    setPickedDay(key);
  }, [
    activeSubjectId,
    nearest?.id,
    tz,
    listedSlots,
    state.slotBySubjectId,
  ]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ day: null, key: `pad-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({
      day: d,
      key: `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  const slotsOnDay = (key: string) =>
    openSlots.filter((s) => dateKey(s.startsAt, s.timezone || tz) === key);

  const dayState = (key: string) => {
    const todayKey = dateKey(new Date().toISOString(), tz);
    if (key < todayKey) return "past" as const;
    const slots = slotsOnDay(key);
    if (slots.length === 0) return "none" as const;
    if (slots.every((s) => s.available <= 0)) return "full" as const;
    return "open" as const;
  };

  const times = pickedDay ? slotsOnDay(pickedDay) : [];
  const activeSubject: CatalogItem | undefined = subjects.find(
    (s) => s.id === activeSubjectId,
  );
  const takenElse = new Set(
    Object.entries(state.slotBySubjectId)
      .filter(([sid]) => sid !== activeSubjectId)
      .map(([, id]) => id),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold">Choose your trial class</h2>
        <p className="text-[13px] text-[#6b7280]">{COPY.trialClass}</p>
      </div>

      {subjects.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => {
            const chosen = Boolean(state.slotBySubjectId[s.id]);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSubjectId(s.id)}
                className={`rounded-full px-3 py-1 text-[13px] ${
                  activeSubjectId === s.id
                    ? "bg-[#ecfdf5] font-medium text-[#166534] ring-1 ring-[#3ecf8e]"
                    : "bg-white text-[#6b7280] ring-1 ring-[#e5e7eb]"
                }`}
              >
                {chosen ? "✓ " : ""}
                {s.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeSubject ? (
        <p className="text-[13px] text-[#6b7280]">
          Choose a date and time for the {activeSubject.name} trial class.
        </p>
      ) : null}

      {slotsLoading ? (
        <p className="text-[13px] text-[#6b7280]">Checking available times…</p>
      ) : (
        <div className="rounded-lg border border-[#e5e7eb] p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[13px] text-[#166534]"
              onClick={() =>
                setCursor((c) =>
                  c.month === 0
                    ? { year: c.year - 1, month: 11 }
                    : { year: c.year, month: c.month - 1 },
                )
              }
            >
              Previous
            </button>
            <p className="text-[14px] font-medium">
              {monthLabel(cursor.year, cursor.month)}
            </p>
            <button
              type="button"
              className="text-[13px] text-[#166534]"
              onClick={() =>
                setCursor((c) =>
                  c.month === 11
                    ? { year: c.year + 1, month: 0 }
                    : { year: c.year, month: c.month + 1 },
                )
              }
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#6b7280]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              if (cell.day == null) {
                return <div key={cell.key} />;
              }
              const st = dayState(cell.key);
              const selected = pickedDay === cell.key;
              const disabled = st === "past" || st === "none";
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPickedDay(cell.key)}
                  className={`min-h-[44px] rounded-md px-1 py-1 text-[12px] ${
                    selected
                      ? "bg-[#ecfdf5] font-medium text-[#166534] ring-1 ring-[#3ecf8e]"
                      : st === "open"
                        ? "bg-white hover:bg-[#f8faf9]"
                        : st === "full"
                          ? "bg-white text-[#991b1b] hover:bg-[#fef2f2]"
                          : "text-[#9ca3af]"
                  }`}
                >
                  <span className="block">{cell.day}</span>
                  {st === "full" ? (
                    <span className="block text-[10px] text-[#991b1b]">Full</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pickedDay && dayState(pickedDay) === "full" ? (
        <p className="text-[13px] text-[#991b1b]">
          All trial classes are fully booked on this date.
        </p>
      ) : null}

      {pickedDay && times.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[13px] font-medium">
            {activeSubject?.name} · {formatClassDate(times[0]!.startsAt)}
          </p>
          {times.map((s) => {
            const full = s.available <= 0;
            const usedByOther = takenElse.has(s.id);
            const selected = state.slotBySubjectId[activeSubjectId] === s.id;
            const unavailable = full || usedByOther;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] ${
                  selected
                    ? "border-[#3ecf8e] bg-[#ecfdf5]"
                    : "border-[#e5e7eb]"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {formatClassTime(s.startsAt, s.endsAt)}
                  </p>
                  <p className="text-[#6b7280]">
                    {full
                      ? "Fully booked"
                      : usedByOther
                        ? "Already chosen for another subject"
                        : seatsLabel(s.available)}
                  </p>
                </div>
                <Btn
                  disabled={unavailable && !selected}
                  variant={selected ? "primary" : "secondary"}
                  onClick={() =>
                    activeSubjectId && setSlotForSubject(activeSubjectId, s.id)
                  }
                >
                  {full ? "Unavailable" : selected ? "Selected" : "Select"}
                </Btn>
              </div>
            );
          })}
        </div>
      ) : null}

      {state.slotBySubjectId[activeSubjectId] ? (
        <p className="text-[13px] text-[#166534]">
          Selected:{" "}
          {(() => {
            const s = listedSlots.find(
              (row) => row.id === state.slotBySubjectId[activeSubjectId],
            );
            if (!s) return "Class selected";
            return `${formatClassDate(s.startsAt)} · ${formatClassTime(s.startsAt, s.endsAt)}`;
          })()}
        </p>
      ) : null}

      <div className="flex justify-between">
        <Btn variant="secondary" onClick={back}>
          Back
        </Btn>
        <Btn onClick={() => void next()}>Continue</Btn>
      </div>
    </div>
  );
}
