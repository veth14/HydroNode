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
  /** Floating card anchor right above the sensor pair in normalized GLB world space */
  labelPos: [number, number, number];
  /** Pipe-level pin position at the white flow sensor */
  flowPos: [number, number, number];
  /** Pipe-level pin position at the metallic/black pressure transducer */
  pressurePos: [number, number, number];
}

// Exact Three.js world positions derived from public/pipeline.glb vertices:
// Model centered at origin, bottom at y=0, rotated +90 deg around Y, scaled to 11 units wide (scale=7.891).
export const SENSOR_3D_NODES: Record<StationId, Sensor3DNode> = {
  S1: {
    stationId: "S1",
    zoneId: 1,
    labelPos: [-3.05, 0.95, 0.53],
    flowPos: [-3.28, 0.22, 1.4],
    pressurePos: [-2.82, 0.2, -0.34],
  },
  S2: {
    stationId: "S2",
    zoneId: 2,
    labelPos: [-1.12, 0.95, -0.18],
    flowPos: [-1.35, 0.22, -1.13],
    pressurePos: [-0.88, 0.2, 0.77],
  },
  S3: {
    stationId: "S3",
    zoneId: 3,
    labelPos: [0.82, 0.95, 0.53],
    flowPos: [0.58, 0.22, 1.4],
    pressurePos: [1.05, 0.2, -0.34],
  },
  S4: {
    stationId: "S4",
    zoneId: 4,
    labelPos: [2.75, 0.95, -0.18],
    flowPos: [2.52, 0.22, -1.13],
    pressurePos: [2.98, 0.2, 0.77],
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
