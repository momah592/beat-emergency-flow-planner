export type LatLng = [number, number];

export type Ambulance = {
  id: string;
  callsign: string;
  position: LatLng;
  status: "available" | "on scene";
};

export type Hospital = {
  id: string;
  name: string;
  shortName: string;
  position: LatLng;
  /**
   * The scenario in src/data/fixtures.ts whose DCC TRIPS corridor and published
   * INMO figure describe this pathway. Absent when no public source covers it,
   * in which case the hospital has no evidence rather than invented numbers.
   */
  dataSlot?: "a" | "b";
};

export type Incident = {
  id: string;
  label: string;
  area: string;
  position: LatLng;
  /** The ambulance already on scene. */
  ambulanceId: string;
  /** The two hospitals in range, compared as Scenario A and Scenario B. */
  candidateHospitalIds: [string, string];
  /** Declared pathway names for A and B. Falls back to each hospital's short name. */
  pathways?: [string, string];
  /** Shown on the traffic evidence when the saved corridor is a stand-in for this scene. */
  corridorNote?: string;
  /** DFB station area whose historical aggregate is shown as context. Absent means all areas. */
  dfbStationArea?: string;
};
