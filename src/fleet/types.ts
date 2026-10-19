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
  /** DFB station area whose historical aggregate is shown as context. Absent means all areas. */
  dfbStationArea?: string;
};
