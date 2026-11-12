"use client";
// src/components/map/SiteMapInner.tsx
// Leaflet + OpenStreetMap component loaded client-side only.
// Split into two separate effects to prevent reload loop:
//   Effect 1 (empty deps) — initialises the Leaflet map instance exactly once.
//   Effect 2 ([stations, alerts, injectedLeaks]) — updates polyline colours and
//   marker popup content on the already-mounted map; never tears down the map.

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

  // Stable refs to Leaflet layer objects — updated in Effect 2 without
  // destroying / re-creating the map.
  const polylineRefsRef = useRef<Map<number, L.Polyline>>(new Map());
  const markerRefsRef = useRef<Map<StationId, L.Marker>>(new Map());

  // Store subscriptions — these will trigger Effect 2 on change.
  const stations = useHydroStore((s) => s.stations);
  const alerts = useHydroStore((s) => s.alerts);
  const injectedLeaks = useHydroStore((s) => s.injectedLeaks);

  // ─────────────────────────────────────────────────────────────────────────
  // Effect 1: Initialise the Leaflet map ONCE — no data deps, no teardown
  //           until the component fully unmounts.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialise Map centered on Caloocan City, Philippines
    const map = L.map(mapContainerRef.current).setView(SITE_CENTER, 17);
    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create zone polylines with placeholder colour — Effect 2 will set the
    // correct colour based on live data immediately after.
    ZONES.forEach((zone) => {
      const coordA = STATION_LATLNG[zone.stationA];
      const coordB = STATION_LATLNG[zone.stationB];

      const polyline = L.polyline([coordA, coordB], {
        color: "#0284c7",
        weight: 5,
        opacity: 0.85,
      }).addTo(map);

      polyline.bindPopup(""); // content set in Effect 2
      polylineRefsRef.current.set(zone.id, polyline);
    });

    // Create station markers — popup content set in Effect 2.
    STATION_IDS.forEach((sid) => {
      const coords = STATION_LATLNG[sid];

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
      marker.bindPopup(""); // content set in Effect 2
      markerRefsRef.current.set(sid, marker);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      polylineRefsRef.current.clear();
      markerRefsRef.current.clear();
    };
  }, []); // ← empty: runs once on mount, cleans up on unmount only

  // ─────────────────────────────────────────────────────────────────────────
  // Effect 2: Update existing layers whenever live data changes.
  //           NEVER re-creates the map; only mutates polyline styles and
  //           popup HTML on the already-mounted Leaflet instances.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeAlerts = alerts.filter((a) => a.status === "active");

    // Update zone polylines
    ZONES.forEach((zone) => {
      const polyline = polylineRefsRef.current.get(zone.id);
      if (!polyline) return;

      const alert = activeAlerts.find((a) => a.zoneId === zone.id);
      const isSimulatedLeak = injectedLeaks.includes(zone.id);
      const hasIssue = !!(alert || isSimulatedLeak);

      const color =
        alert?.severity === "high" || isSimulatedLeak
          ? "#ef4444"
          : alert?.severity === "medium"
          ? "#f59e0b"
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

    // Update station marker popups
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
  }, [stations, alerts, injectedLeaks]); // ← data deps only; map is never re-created

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[550px] rounded-xl overflow-hidden shadow-inner border border-[#1e2733] bg-[#0a0d12]"
    />
  );
}
