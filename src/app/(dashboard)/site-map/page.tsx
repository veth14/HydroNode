"use client";
// src/app/(dashboard)/site-map/page.tsx
// Geographic Site Map using Leaflet + OpenStreetMap (SSR disabled).

import dynamic from "next/dynamic";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Info, MapPin } from "lucide-react";

const SiteMapInner = dynamic(
  () => import("@/components/map/SiteMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[550px] bg-[#0a0d12] rounded-xl flex items-center justify-center text-[#7a8fa6] text-xs font-mono animate-pulse border border-[#1e2733]">
        Initializing Geographic Map (Caloocan City, Philippines)...
      </div>
    ),
  }
);

export default function SiteMapPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans font-mono">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#1e2733]">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00b4d8]" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Geographic Pipeline Corridor
            </h1>
          </div>
          <p className="text-xs text-[#7a8fa6] mt-0.5">
            OpenStreetMap projection of municipal distribution zones (Caloocan City, Philippines)
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-[#7a8fa6] bg-[#0f1419] px-3 py-1.5 rounded-lg border border-[#1e2733]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#00b4d8] rounded-full" /> Nominal Pipeline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-400 rounded-full" /> Elevated Sampling
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-red-400 rounded-full" /> Active Leak Flagged
          </span>
        </div>
      </div>

      <Card glow={true}>
        <CardContent className="p-3">
          <SiteMapInner />
        </CardContent>
      </Card>

      <div className="p-3.5 bg-[#0f1419] border border-[#1e2733] rounded-xl flex items-start gap-3 text-xs text-[#7a8fa6]">
        <Info className="w-4 h-4 text-[#00b4d8] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The physical test rig simulates this 500-meter distribution main. Station GPS coordinates are calibrated to key junction manifolds along the street easement for maintenance crew dispatch.
        </p>
      </div>
    </div>
  );
}
