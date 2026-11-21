import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReqLens — requirements next to your draft",
  description:
    "Paste a notice and your draft. ReqLens lists every requirement with its exact source sentence and shows what your draft has and what it is missing.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
