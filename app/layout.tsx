import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laplog — Productivity Analytics",
  description: "Turn daily stopwatch laps into productivity insights.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
