"use client";

export function PassFailBanner({
  pass,
  summary,
}: {
  pass: boolean | null;
  summary: string;
}) {
  if (pass == null) return null;
  return (
    <div
      className={`rounded-md border px-3 py-2 text-[13px] font-medium ${
        pass
          ? "border-[#b7e4cd] bg-[#ecfdf5] text-[#166534]"
          : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
      }`}
    >
      {pass ? "✓ PASS" : "✕ FAIL"} — {summary}
    </div>
  );
}

export function InventoryStrip({
  capacity,
  available,
  label,
}: {
  capacity: number;
  available: number;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap gap-4 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-[13px]">
      {label ? <span className="font-medium text-[#1c1c1c]">{label}</span> : null}
      <span className="text-[#6b7280]">
        Capacity: <strong className="text-[#1c1c1c]">{capacity}</strong>
      </span>
      <span className="text-[#6b7280]">
        Available: <strong className="text-[#1c1c1c]">{available}</strong>
      </span>
    </div>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="mb-2 text-[13px] font-medium text-[#1c1c1c]">{title}</h2>
      {children}
    </section>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#3ecf8e] text-[#1c1c1c] hover:bg-[#36b87e]"
      : variant === "danger"
        ? "border border-[#fecaca] bg-white text-[#991b1b] hover:bg-[#fef2f2]"
        : "border border-[#d1d5db] bg-white text-[#1c1c1c] hover:bg-[#f3f4f6]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
