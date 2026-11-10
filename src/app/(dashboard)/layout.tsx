"use client";
// src/app/(dashboard)/layout.tsx
// Dashboard Shell with Sidebar, TopBar, and live polling hook.

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { usePolling } from "@/hooks/usePolling";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Polls backend /api endpoints every 3 seconds and updates Zustand store
  usePolling();

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d12] text-[#e8edf2]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6 bg-[#0a0d12]">
          {children}
        </main>
      </div>
    </div>
  );
}
