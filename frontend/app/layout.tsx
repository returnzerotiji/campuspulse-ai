import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusPulse",
  description: "Campus problem reporting and tracking (Phase 1 - no AI yet)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
