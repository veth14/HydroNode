"use client";
// src/app/(dashboard)/analysis/page.tsx
// Leak Analysis & Calculator in Light Mode.
// Follows all 20 Rules:
// - Sans-serif typography for labels, font-mono for data/numbers
// - High text contrast (WCAG AAA)
// - Clean white surfaces and slate borders

import { useState } from "react";
import {
  leakRate,
  severityIndex,
  classifySeverity,
  recommendedAction,
} from "@/lib/leakLogic";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Droplets, Gauge, Waves } from "lucide-react";

export default function LeakAnalysisPage() {
  const [q0, setQ0] = useState<number>(15.0);
  const [q, setQ] = useState<number>(11.2);
  const [p0, setP0] = useState<number>(5.0);
  const [p, setP] = useState<number>(4.4);

  const [lowThresh, setLowThresh] = useState<number>(5.0);
  const [medThresh, setMedThresh] = useState<number>(10.0);

  const computedLeakRate = leakRate(q0, q);
  const computedSI = severityIndex(p0, p);
  const computedSeverity = classifySeverity(computedSI, {
    low: lowThresh,
    medium: medThresh,
  });
  const computedAction = recommendedAction(computedSeverity);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Hydraulic Leak Analysis & Models
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Compute severity indices and review the algorithmic detection pipeline
        </p>
      </div>

      {/* Interactive Calculator Card */}
      <Card>
        <CardHeader
          title="Hydraulic Severity & Leak Rate Calculator"
          subtitle="Evaluates L = Q₀ − Q and SI = (ΔP / P₀) × 100%"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inputs Column */}
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-700 block">
                Hydraulic Parameters
              </span>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Baseline Flow Q₀ (L/min)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={q0}
                    onChange={(e) => setQ0(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-mono tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Measured Flow Q (L/min)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={q}
                    onChange={(e) => setQ(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-mono tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Baseline Pressure P₀ (bar)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={p0}
                    onChange={(e) => setP0(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-mono tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Measured Pressure P (bar)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={p}
                    onChange={(e) => setP(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-mono tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span>Low Threshold: &lt;</span>
                  <input
                    type="number"
                    value={lowThresh}
                    onChange={(e) => setLowThresh(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center font-mono tabular-nums bg-white text-slate-900 shadow-xs"
                  />
                  <span>%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Medium Threshold: &lt;</span>
                  <input
                    type="number"
                    value={medThresh}
                    onChange={(e) => setMedThresh(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center font-mono tabular-nums bg-white text-slate-900 shadow-xs"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-600">
                    Calculated Result
                  </span>
                  <Badge
                    variant={
                      computedSeverity === "high"
                        ? "critical"
                        : computedSeverity === "medium"
                        ? "warning"
                        : "info"
                    }
                    dot
                  >
                    {computedSeverity.toUpperCase()} SEVERITY
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Estimated Leak Rate
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold font-mono tabular-nums text-red-600">
                        {computedLeakRate.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500">L/min</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">
                      Severity Index (SI)
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold font-mono tabular-nums text-amber-800">
                        {computedSI.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-md border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Recommended Response:
                  </span>
                  <p className="text-xs font-medium text-slate-900">
                    {computedAction}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200 font-mono tabular-nums">
                ΔP: {(p0 - p).toFixed(2)} bar · Flow Drop: {(q0 - q).toFixed(2)} L/min
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Algorithmic Pipeline Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Detection Architecture & Algorithmic Methods
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Three synergistic mathematical stages running across ESP32-S3 edge MCU and web dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  <span>1. Flow Imbalance Localization</span>
                </div>
              }
            />
            <CardContent className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Compares flow rates between adjacent sensor stations bounding each pipe zone: <strong className="text-slate-900">ΔQ = Q_up − Q_down</strong> via Hall-effect turbine meters isolated through EL817 optocouplers.
              </p>
              <p>
                In a closed pipeline, flow into a zone must equal flow out minus leaks. The zone with maximum negative ΔQ is localized as the breach segment.
              </p>
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-indigo-600" />
                  <span>2. Pressure Severity Index (SI)</span>
                </div>
              }
            />
            <CardContent className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Calculates relative pressure deficit against calibrated baseline P₀: <strong className="text-slate-900">SI = (ΔP / P₀) × 100%</strong> using 5V transducers with 10kΩ/20kΩ dividers digitized on dual ADS1115 16-bit I²C ADCs.
              </p>
              <p>
                SI maps directly to water district triage tiers: Low (&lt;5%), Medium (5–10%), High (&gt;10%), dictating response dispatch urgency.
              </p>
            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-amber-600" />
                  <span>3. Seismic Wave & Edge Classifier</span>
                </div>
              }
            />
            <CardContent className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Piezoelectric film sensor modules isolated via EL817 optocouplers measure elastic acoustic and physical vibration waves propagating through the pipe wall. Edge feature extraction computes seismic RMS acceleration and wavefront energy bands.
              </p>
              <p>
                The on-device model distinguishes true pressurized orifice seismic wave dispersion (15–240 Hz) from surface pump transients and vehicular ground traffic.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
