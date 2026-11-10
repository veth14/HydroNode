// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "HydroNode — IoT Pipe Leak Detection",
  description: "Low-cost IoT water pipe leak detection system supporting SDG 6.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans h-full antialiased`}
        style={{ background: "var(--surface-bg)", color: "var(--text-primary)" }}
      >
        {children}
      </body>
    </html>
  );
}
