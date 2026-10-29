import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalSosOverlay } from "@/components/layout/GlobalSosOverlay";
import { ViraCompanionPanel } from "@/components/vira/ViraCompanionPanel";
import { LocationGate } from "@/components/layout/LocationGate";

/**
 * Use a system-font stack via next/font/local so builds succeed offline
 * (no Google Fonts fetch). The CSS variable --font-inter is kept for
 * backward-compatibility with all existing Tailwind / CSS references.
 */
const inter = localFont({
  src: [
    {
      path: "./fonts/inter-var-latin.woff2",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: [
    "Inter",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#E64A7B",
};

export const metadata: Metadata = {
  title: "Vira — Predictive Women's Safety Intelligence Platform",
  description:
    "Don't just detect danger. Predict it. Explain it. Prevent it. AI-powered predictive safety scores, explainable risk zones, safety-optimized routing, and consent-based Trusted Circle protection.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-blush-light text-ink">
        {children}
        <GlobalSosOverlay />
        <ViraCompanionPanel />
        <LocationGate />
      </body>
    </html>
  );
}

