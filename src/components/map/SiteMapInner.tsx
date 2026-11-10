"use client";
// src/components/map/SiteMapInner.tsx
// Leaflet + OpenStreetMap component loaded client-side only.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  SITE_CENTER,
  STATION_LATLNG,
  STATION_IDS,
  ZONES,
  type StationId,
} from "@/config/rig";
import { useHydroStore } from "@/store/hydroStore";

export default function SiteMapInner() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const injectedLeaks = useHydroStore((s) => s.injectedLeaks);

  const activeAlerts = alerts.filter((a) => a.status === "active");

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Initialize Map centered on Caloocan City, Philippines
    const map = L.map(mapContainerRef.current).setView(SITE_CENTER, 17);
    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Render 5 Zones as Polylines
    ZONES.forEach((zone) => {
      const coordA = STATION_LATLNG[zone.stationA];
      const coordB = STATION_LATLNG[zone.stationB];

      const alert = activeAlerts.find((a) => a.zoneId === zone.id);
      const isSimulatedLeak = injectedLeaks.includes(zone.id);

      const color =
        alert?.severity === "high" || isSimulatedLeak
          ? "#ef4444"
          : alert?.severity === "medium"
          ? "#f59e0b"
          : "#0284c7";

      const polyline = L.polyline([coordA, coordB], {
        color,
        weight: alert || isSimulatedLeak ? 8 : 5,
        opacity: 0.85,
        dashArray: alert || isSimulatedLeak ? "8, 8" : undefined,
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #0f172a;">Zone ${zone.id} Pipeline</strong><br/>
          <span>${zone.stationA} &rarr; ${zone.stationB}</span><br/>
          <span>Status: <strong style="color: ${color};">${
            alert ? alert.severity.toUpperCase() + " ALERT" : "Normal"
          }</strong></span>
        </div>
      `);
    });

    // Render Station Markers S1–S6
    STATION_IDS.forEach((sid) => {
      const coords = STATION_LATLNG[sid];
      const stationData = stations.find((s) => s.id === sid);

      const markerHtml = `
        <div style="
          background-color: #0f172a;
          color: #38bdf8;
          border: 2px solid #38bdf8;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        ">
          ${sid}
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-station-icon",
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.5;">
          <strong style="font-size: 13px; color: #0284c7;">Station ${sid}</strong><br/>
          <span>Flow: <strong>${
            stationData?.latestFlow != null
              ? stationData.latestFlow.toFixed(2) + " L/min"
              : "--"
          }</strong></span><br/>
          <span>Pressure: <strong>${
            stationData?.latestPressure != null
              ? stationData.latestPressure.toFixed(2) + " bar"
              : "--"
          }</strong></span><br/>
          <span>Vibration: <strong>${
            stationData?.latestVibration != null
              ? stationData.latestVibration.toFixed(3) + " g"
              : "--"
          }</strong></span>
        </div>
      `);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [stations, activeAlerts, injectedLeaks]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[550px] rounded-xl overflow-hidden shadow-inner border border-slate-300"
    />
  );
}

