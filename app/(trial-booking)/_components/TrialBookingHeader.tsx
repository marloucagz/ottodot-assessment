"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/trial-booking/book", label: "Book", match: "/trial-booking/book" },
  { href: "/trial-booking/demo", label: "Demo", match: "/trial-booking/demo" },
  { href: "/trial-booking/seed", label: "Seed", match: "/trial-booking/seed" },
] as const;

export function TrialBookingHeader() {
  const pathname = usePathname() ?? "";

  return (
    <header className="border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3">
        <Link
          href="/trial-booking/demo"
          className="text-[14px] font-semibold text-[#1c1c1c]"
        >
          Trial Booking
        </Link>
        <nav className="flex gap-3 text-[13px] text-[#6b7280]">
          {NAV.map((item) => {
            const active =
              pathname.startsWith(item.match) ||
              (item.match === "/trial-booking/book" &&
                pathname.startsWith("/trial-booking/payment"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "font-medium text-[#1c1c1c]"
                    : "hover:text-[#1c1c1c]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
