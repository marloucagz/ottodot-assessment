"use client";

import { useEffect, useRef } from "react";

export type LogLevel = "info" | "success" | "error";

export type LogEntry = {
  id: number;
  at: Date;
  level: LogLevel;
  message: string;
};

function formatTime(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

export function EventLog({ logs }: { logs: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const levelClass: Record<LogLevel, string> = {
    info: "text-[#6b7280]",
    success: "text-[#3c8c6c]",
    error: "text-[#c81e1e]",
  };

  return (
    <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
      <div className="border-b border-[#e5e7eb] px-3 py-2 text-[13px] font-medium">
        Activity log
      </div>
      <div className="max-h-56 overflow-y-auto bg-[#fafafa] px-3 py-2">
        {logs.length === 0 ? (
          <p className="text-[13px] text-[#9ca3af]">No events yet.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {logs.map((entry) => (
                <li
                  key={`event-log-${entry.id}`}
                  className={`flex gap-2 text-[12px] leading-5 ${levelClass[entry.level]}`}
                  style={{
                    fontFamily:
                      "var(--tb-font-mono), ui-monospace, monospace",
                  }}
                >
                  <span className="shrink-0 text-[#9ca3af]">
                    {formatTime(entry.at)}
                  </span>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ul>
            <div ref={endRef} />
          </>
        )}
      </div>
    </div>
  );
}
