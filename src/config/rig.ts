// src/config/rig.ts
// Geometry and coordinates for the physical test rig serpentine loop.
// ViewBox coordinate space: 1200 × 720.

export const STATION_IDS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
export type StationId = (typeof STATION_IDS)[number];

export const ZONE_IDS = [1, 2, 3, 4, 5] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export interface StationPos {
  x: number;
  y: number;
  label: StationId;
}

export interface ZoneMeta {
  id: ZoneId;
  stationA: StationId;
  stationB: StationId;
  labelAbove: boolean; // true: above pipe (Zones 1, 3, 5); false: below (Zones 2, 4)
  labelPos: { x: number; y: number };
  bandRect: { x: number; y: number; width: number; height: number };
}

// 6 Sensor Stations at zone boundaries
// Pipe snaking from left (S1) across 5 zones to right (S6)
export const STATIONS: Record<StationId, StationPos> = {
  S1: { x: 120, y: 360, label: "S1" }, // Entry up far-left leg
  S2: { x: 260, y: 360, label: "S2" }, // Leg 2
  S3: { x: 440, y: 360, label: "S3" }, // Leg 3
  S4: { x: 620, y: 360, label: "S4" }, // Leg 4
  S5: { x: 800, y: 360, label: "S5" }, // Leg 5
  S6: { x: 980, y: 360, label: "S6" }, // Exit leg down to drain
};

// 5 Zones left to right
// Labels for 1, 3, 5 sit ABOVE pipe; 2 and 4 sit BELOW pipe
export const ZONES: ZoneMeta[] = [
  {
    id: 1,
    stationA: "S1",
    stationB: "S2",
    labelAbove: true,
    labelPos: { x: 190, y: 155 },
    bandRect: { x: 100, y: 175, width: 170, height: 390 },
  },
  {
    id: 2,
    stationA: "S2",
    stationB: "S3",
    labelAbove: false,
    labelPos: { x: 350, y: 585 },
    bandRect: { x: 270, y: 175, width: 180, height: 390 },
  },
  {
    id: 3,
    stationA: "S3",
    stationB: "S4",
    labelAbove: true,
    labelPos: { x: 530, y: 155 },
    bandRect: { x: 450, y: 175, width: 180, height: 390 },
  },
  {
    id: 4,
    stationA: "S4",
    stationB: "S5",
    labelAbove: false,
    labelPos: { x: 710, y: 585 },
    bandRect: { x: 630, y: 175, width: 180, height: 390 },
  },
  {
    id: 5,
    stationA: "S5",
    stationB: "S6",
    labelAbove: true,
    labelPos: { x: 890, y: 155 },
    bandRect: { x: 810, y: 175, width: 180, height: 390 },
  },
];

// Continuous serpentine path forming U-shapes across workbench
// Top bends at Y=190, Bottom bends at Y=550
export const SERPENTINE_PIPE_PATH = `
  M 50,550 
  L 120,550 
  L 120,190 
  L 260,190 
  L 260,550 
  L 440,550 
  L 440,190 
  L 620,190 
  L 620,550 
  L 800,550 
  L 800,190 
  L 980,190 
  L 980,550 
  L 1050,550
`.replace(/\s+/g, " ").trim();

// Elbow fitting corner centers for realistic PVC rings
export const ELBOW_FITTINGS: [number, number][] = [
  [120, 550],
  [120, 190],
  [260, 190],
  [260, 550],
  [440, 550],
  [440, 190],
  [620, 190],
  [620, 550],
  [800, 550],
  [800, 190],
  [980, 190],
  [980, 550],
];

// Leak test point ports (ball valve/orifice simulation valves) positioned along zone segments
export interface TestPoint {
  id: string;
  zoneId: ZoneId;
  x: number;
  y: number;
  label: string;
}

export const TEST_POINTS: TestPoint[] = [
  { id: "TP1", zoneId: 1, x: 190, y: 190, label: "Leak Valve Z1" },
  { id: "TP2", zoneId: 2, x: 350, y: 550, label: "Leak Valve Z2" },
  { id: "TP3", zoneId: 3, x: 530, y: 190, label: "Leak Valve Z3" },
  { id: "TP4", zoneId: 4, x: 710, y: 550, label: "Leak Valve Z4" },
  { id: "TP5", zoneId: 5, x: 890, y: 190, label: "Leak Valve Z5" },
];

// Single above-ground ESP32 controller mounted at top center
export const ESP32_POS = { x: 490, y: 35, width: 220, height: 95 };

// Geographic coordinates for site map
export const SITE_CENTER: [number, number] = [14.6507, 120.9822];

export const STATION_LATLNG: Record<StationId, [number, number]> = {
  S1: [14.6505, 120.9818],
  S2: [14.6507, 120.9820],
  S3: [14.6509, 120.9822],
  S4: [14.6511, 120.9824],
  S5: [14.6513, 120.9826],
  S6: [14.6515, 120.9828],
};
