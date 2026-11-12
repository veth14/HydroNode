"use client";
// src/components/map/SiteMapInner.tsx
// Leaflet + OpenStreetMap component in Light Mode.
// Split into two separate effects to prevent reload loop:
//   Effect 1 (empty deps) — initialises the Leaflet map instance once.
//   Effect 2 ([stations, alerts, injectedLeaks]) — updates layer styles and popups in place.

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

  const polylineRefsRef = useRef<Map<number, L.Polyline>>(new Map());
  const markerRefsRef = useRef<Map<StationId, L.Marker>>(new Map());

  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const injectedLeaks = useHydroStore((s) => s.injectedLeaks);

  // Effect 1: Initialise Leaflet map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(SITE_CENTER, 17);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    ZONES.forEach((zone) => {
      const coordA = STATION_LATLNG[zone.stationA];
      const coordB = STATION_LATLNG[zone.stationB];

      const polyline = L.polyline([coordA, coordB], {
        color: "#0284c7",
        weight: 5,
        opacity: 0.85,
      }).addTo(map);

      polyline.bindPopup("");
      polylineRefsRef.current.set(zone.id, polyline);
    });

    STATION_IDS.forEach((sid) => {
      const coords = STATION_LATLNG[sid];

      const markerHtml = `
        <div style="
          background-color: #ffffff;
          color: #0284c7;
          border: 2px solid #0284c7;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 11px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
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
      marker.bindPopup("");
      markerRefsRef.current.set(sid, marker);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      polylineRefsRef.current.clear();
      markerRefsRef.current.clear();
    };
  }, []);

  // Effect 2: Update existing layers without unmounting
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeAlerts = alerts.filter((a) => a.status === "active");

    ZONES.forEach((zone) => {
      const polyline = polylineRefsRef.current.get(zone.id);
      if (!polyline) return;

      const alert = activeAlerts.find((a) => a.zoneId === zone.id);
      const isSimulatedLeak = injectedLeaks.includes(zone.id);
      const hasIssue = !!(alert || isSimulatedLeak);

      const color =
        alert?.severity === "high" || isSimulatedLeak
          ? "#dc2626"
          : alert?.severity === "medium"
          ? "#d97706"
          : "#0284c7";

      polyline.setStyle({
        color,
        weight: hasIssue ? 8 : 5,
        opacity: 0.85,
        dashArray: hasIssue ? "8, 8" : undefined,
      });

      polyline.setPopupContent(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #0f172a;">Zone ${zone.id} Pipeline</strong><br/>
          <span>${zone.stationA} &rarr; ${zone.stationB}</span><br/>
          <span>Status: <strong style="color: ${color};">${
            alert ? alert.severity.toUpperCase() + " ALERT" : "Normal"
          }</strong></span>
        </div>
      `);
    });

    STATION_IDS.forEach((sid) => {
      const marker = markerRefsRef.current.get(sid);
      if (!marker) return;

      const stationData = stations.find((s) => s.id === sid);

      marker.setPopupContent(`
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
          <span>Seismic RMS: <strong>${
            stationData?.latestVibration != null
              ? stationData.latestVibration.toFixed(3) + " g"
              : "--"
          }</strong></span>
        </div>
      `);
    });
  }, [stations, alerts, injectedLeaks]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[550px] rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-slate-50"
    />
  );
}
