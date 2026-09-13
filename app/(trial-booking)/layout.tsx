import type { CSSProperties, ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { TrialBookingHeader } from "./_components/TrialBookingHeader";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--tb-font-sans",
  display: "swap",
  // next/font preload links use index keys; multiple fonts collide in <head>.
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--tb-font-mono",
  display: "swap",
  preload: false,
});

export default function TrialBookingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`light ${plexSans.variable} ${plexMono.variable} flex min-h-full flex-1 flex-col bg-[#f8f9fa] text-[#1c1c1c] antialiased`}
      style={
        {
          fontFamily: "var(--tb-font-sans), ui-sans-serif, system-ui, sans-serif",
          fontSize: "14px",
          lineHeight: "1.5",
          colorScheme: "light",
        } as CSSProperties
      }
    >
      <TrialBookingHeader />
      {children}
    </div>
  );
}
