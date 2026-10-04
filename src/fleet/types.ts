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
  /** Published daily trolley count. Not an ED waiting time, not live capacity. */
  trolleyCount: number;
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
  /** Observed corridor journey minutes from the scene, keyed by hospital id. */
  journeyMinutes: Record<string, number>;
};
