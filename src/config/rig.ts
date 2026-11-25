// src/config/rig.ts
// Physical rig geometry — 4-zone serpentine PVC pipeline.
// Live only: 4 junctions × 2 sensors = 8 sensors (flow + pressure, no vibration yet).
// Matches public/pipeline.glb orientation (rotated +90 deg Y to span left -> right).

export const STATION_IDS = ["S1", "S2", "S3", "S4"] as const;
export type StationId = (typeof STATION_IDS)[number];

export const ZONE_IDS = [1, 2, 3, 4] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export interface ZoneMeta {
  id: ZoneId;
  stationA: StationId;
  stationB: StationId;
}

// 4 Zones corresponding to the 4 instrumented pipeline segments
export const ZONES: ZoneMeta[] = [
  { id: 1, stationA: "S1", stationB: "S2" },
  { id: 2, stationA: "S2", stationB: "S3" },
  { id: 3, stationA: "S3", stationB: "S4" },
  { id: 4, stationA: "S4", stationB: "S4" },
];

export interface Sensor3DNode {
  stationId: StationId;
  zoneId: ZoneId;
  /** Emitter pad anchor right on top of the blue PVC pipe centerline (midpoint between Flow & Pressure) */
  labelPos: [number, number, number];
  /** Pipe centerline X coordinate for this serpentine leg */
  pipeX: number;
  /** Top-surface pin position centered on the white turbine flow sensor cap */
  flowPos: [number, number, number];
  /** Top-surface pin position centered on the black pressure transducer body */
  pressurePos: [number, number, number];
}

// Exact Three.js world positions derived from public/pipeline.glb vertices:
// Model centered at origin, bottom at y=0, rotated +90 deg around Y, scaled to 11 units wide (scale=7.891).
// Blue PVC pipe crown y = 0.268; white flow cap top y = 0.387; black pressure top y = 0.259.
export const SENSOR_3D_NODES: Record<StationId, Sensor3DNode> = {
  S1: {
    stationId: "S1",
    zoneId: 1,
    pipeX: -3.393,
    labelPos: [-3.393, 0.27, 0.561],
    flowPos: [-3.417, 0.42, 1.46],
    pressurePos: [-2.671, 0.268, -0.339],
  },
  S2: {
    stationId: "S2",
    zoneId: 2,
    pipeX: -1.46,
    labelPos: [-1.46, 0.27, -0.15],
    flowPos: [-1.484, 0.42, -1.065],
    pressurePos: [-0.738, 0.268, 0.766],
  },
  S3: {
    stationId: "S3",
    zoneId: 3,
    pipeX: 0.473,
    labelPos: [0.473, 0.27, 0.561],
    flowPos: [0.45, 0.42, 1.46],
    pressurePos: [1.196, 0.268, -0.339],
  },
  S4: {
    stationId: "S4",
    zoneId: 4,
    pipeX: 2.407,
    labelPos: [2.407, 0.27, -0.15],
    flowPos: [2.383, 0.42, -1.065],
    pressurePos: [3.129, 0.268, 0.766],
  },
};

export const SENSOR_3D_POSITIONS: Record<StationId, [number, number, number]> = {
  S1: SENSOR_3D_NODES.S1.labelPos,
  S2: SENSOR_3D_NODES.S2.labelPos,
  S3: SENSOR_3D_NODES.S3.labelPos,
  S4: SENSOR_3D_NODES.S4.labelPos,
};

// Geographic coordinates
export const SITE_CENTER: [number, number] = [14.6507, 120.9822];
export const STATION_LATLNG: Record<StationId, [number, number]> = {
  S1: [14.6505, 120.9818],
  S2: [14.6507, 120.9820],
  S3: [14.6509, 120.9822],
  S4: [14.6511, 120.9824],
};
