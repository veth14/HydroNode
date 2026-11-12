"use client";
// src/app/(dashboard)/site-map/page.tsx
// Geographic Site Map in Light Mode using Leaflet + OpenStreetMap.

import dynamic from "next/dynamic";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Info, MapPin } from "lucide-react";

const SiteMapInner = dynamic(
  () => import("@/components/map/SiteMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[550px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse border border-slate-200">
        Initializing Geographic Map (Caloocan City, Philippines)...
      </div>
    ),
  }
);

export default function SiteMapPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Geographic Pipeline Corridor
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            OpenStreetMap projection of municipal distribution zones (Caloocan City, Philippines)
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-sky-600 rounded-full" /> Nominal Pipeline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded-full" /> Elevated Sampling
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-red-600 rounded-full" /> Active Leak Flagged
          </span>
        </div>
      </div>

      <Card>
        <CardHeader
          title="GIS Municipal Overlay"
          subtitle="Real-world GPS coordinates for Stations S1 through S6"
        />
        <CardContent>
          <SiteMapInner />

          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Click on any station marker or zone polyline to inspect real-time flow rate, line pressure, and seismic wave RMS energy transmitted from the on-rig transducers.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
