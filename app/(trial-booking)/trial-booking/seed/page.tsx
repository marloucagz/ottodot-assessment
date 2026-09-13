"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DemoSeedStatus = {
  seeded: boolean;
  seededAt: string | null;
  version: string | null;
  summary: {
    slots: {
      lastSeat: { id: string; capacity: number };
      multiChild: { id: string; capacity: number };
      happyPath: { id: string; capacity: number };
      expiration?: { id: string; capacity: number };
    };
    users: {
      parentA: { id: string; email: string; studentIds: string[] };
      parentB: { id: string; email: string; studentIds: string[] };
    };
    gradeId: string;
    levelId: string;
    learningMethodId: string;
    subjectIds: { math: string; science: string };
  } | null;
};

type LogLevel = "info" | "success" | "error";

type LogEntry = {
  id: number;
  at: Date;
  level: LogLevel;
  message: string;
};

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const mono = {
  fontFamily: "var(--tb-font-mono), ui-monospace, monospace",
} as const;

export default function SeedPage() {
  const [status, setStatus] = useState<DemoSeedStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logSeq = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const appendLog = useCallback((message: string, level: LogLevel = "info") => {
    logSeq.current += 1;
    setLogs((prev) => [
      ...prev,
      { id: logSeq.current, at: new Date(), level, message },
    ]);
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/seed");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message ?? data.code ?? "Failed to load seed status");
    }
    setStatus(data as DemoSeedStatus);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err: unknown) => {
      appendLog(
        `Status failed · ${err instanceof Error ? err.message : "Failed to load"}`,
        "error",
      );
    });
  }, [loadStatus, appendLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function runAction(kind: "seed" | "reset") {
    if (busy) return;
    setBusy(true);

    if (kind === "seed") {
      appendLog("Seed started");
      appendLog("Installing demo catalog, slots, and users…");
    } else {
      appendLog("Reset started");
      appendLog("Wiping demo data and re-seeding…");
    }

    try {
      const path = kind === "seed" ? "/api/seed" : "/api/seed/reset";
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? data.code ?? "Request failed");
      }
      const next = data as DemoSeedStatus;
      setStatus(next);
      const version = next.version ? ` · version ${next.version}` : "";
      appendLog(
        kind === "seed"
          ? `Seed finished${version}`
          : `Reset finished${version}`,
        "success",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      appendLog(
        kind === "seed" ? `Seed failed · ${msg}` : `Reset failed · ${msg}`,
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const levelClass: Record<LogLevel, string> = {
    info: "text-[#6b7280]",
    success: "text-[#3c8c6c]",
    error: "text-[#c81e1e]",
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-[18px] font-semibold tracking-tight text-[#1c1c1c]">
          Seed
        </h1>
        <p className="text-[13px] text-[#6b7280]">
          Install race-ready demo data, or wipe and re-seed. Actions only run when
          you click a button.
        </p>
      </header>

      <section className="rounded-md border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[13px] font-medium text-[#1c1c1c]">Status</p>
            <p className="text-[13px] text-[#6b7280]">
              {status == null
                ? "Loading…"
                : status.seeded
                  ? `Seeded${status.seededAt ? ` · ${new Date(status.seededAt).toLocaleString()}` : ""}`
                  : "Not seeded"}
            </p>
            {status?.version ? (
              <p className="text-[12px] text-[#9ca3af]" style={mono}>
                Version {status.version}
              </p>
            ) : null}
          </div>

          {status && !status.seeded ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("seed")}
              className="rounded-[4px] bg-[#3ecf8e] px-3.5 py-1.5 text-[13px] font-medium text-[#1c1c1c] transition hover:bg-[#36b87e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working…" : "Seed"}
            </button>
          ) : null}

          {status?.seeded ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("reset")}
              className="rounded-[4px] border border-[#d1d5db] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1c1c1c] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working…" : "Reset"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="border-b border-[#e5e7eb] px-4 py-2.5">
          <p className="text-[13px] font-medium text-[#1c1c1c]">Activity log</p>
        </div>
        <div className="max-h-64 overflow-y-auto bg-[#fafafa] px-4 py-3">
          {logs.length === 0 ? (
            <p className="text-[13px] text-[#9ca3af]">
              No activity yet. Click Seed or Reset to begin.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {logs.map((entry) => (
                <li
                  key={`seed-log-${entry.id}`}
                  className={`flex gap-2 text-[12px] leading-5 ${levelClass[entry.level]}`}
                  style={mono}
                >
                  <span className="shrink-0 text-[#9ca3af]">
                    {formatTime(entry.at)}
                  </span>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
          <div ref={logEndRef} />
        </div>
      </section>

      {status?.seeded && status.summary ? (
        <section className="rounded-md border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="mb-2 text-[13px] font-medium text-[#1c1c1c]">
            Demo summary
          </h2>
          <ul className="space-y-1.5 text-[13px] text-[#6b7280]">
            {(
              [
                {
                  key: "lastSeat",
                  label: "Last-seat slot (cap 1)",
                  id: status.summary.slots.lastSeat.id,
                },
                {
                  key: "multiChild",
                  label: "Multi-child slot (cap 2)",
                  id: status.summary.slots.multiChild.id,
                },
                {
                  key: "happyPath",
                  label: "Happy-path slot (cap 4)",
                  id: status.summary.slots.happyPath.id,
                },
                ...(status.summary.slots.expiration
                  ? [
                      {
                        key: "expiration" as const,
                        label: "Expiration slot (cap 1)",
                        id: status.summary.slots.expiration.id,
                      },
                    ]
                  : []),
              ]
            ).map((row) => (
              <li key={row.key}>
                {row.label}:{" "}
                <code className="text-[12px] text-[#1c1c1c]" style={mono}>
                  {row.id}
                </code>
              </li>
            ))}
            <li key="parentA">
              Parent A ({status.summary.users.parentA.email}) —{" "}
              {status.summary.users.parentA.studentIds.length} students
            </li>
            <li key="parentB">
              Parent B ({status.summary.users.parentB.email}) —{" "}
              {status.summary.users.parentB.studentIds.length} students
            </li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}
