import type { Ambulance, Hospital, Incident } from "./types";

/**
 * Fleet layer: simulated incidents, their candidate hospitals and units.
 *
 * Each incident -> hospital pathway has a saved road route in fixtures/pathways.json, which is what
 * TRIPS links are matched against. Crowding comes from fixtures/inmo-snapshot.json by hospital name,
 * and a hospital missing from it is shown as unavailable rather than estimated.
 *
 * Ambulance positions are simulated: no public feed publishes live unit locations, and the UI labels
 * them as such.
 */

export const HOSPITALS: Record<string, Hospital> = {
  beaumont: {
    id: "beaumont",
    name: "Beaumont Hospital",
    shortName: "Beaumont",
    position: [53.3889, -6.2297],
  },
  stjames: {
    id: "stjames",
    name: "St James's Hospital",
    shortName: "St James's",
    position: [53.3414, -6.2954],
  },
  tuh: {
    id: "tuh",
    name: "Tallaght University Hospital",
    shortName: "Tallaght University Hospital",
    position: [53.2886, -6.3787],
  },
};

export const AMBULANCES: Ambulance[] = [
  { id: "dfb11", callsign: "DFB 11", position: [53.3382, -6.2591], status: "on scene" },
  { id: "dfb31", callsign: "DFB 31", position: [53.2862, -6.3641], status: "on scene" },
  { id: "dfb07", callsign: "DFB 07", position: [53.351, -6.258], status: "available" },
  { id: "dfb15", callsign: "DFB 15", position: [53.333, -6.265], status: "available" },
  { id: "dfb04", callsign: "DFB 04", position: [53.3465, -6.294], status: "available" },
];

export const INCIDENTS: Incident[] = [
  {
    id: "dublin2",
    label: "St Stephen's Green",
    area: "Dublin 2",
    position: [53.3382, -6.2591],
    ambulanceId: "dfb11",
    candidateHospitalIds: ["beaumont", "stjames"],
  },
  {
    id: "tallaght",
    label: "Tallaght",
    area: "Dublin 24",
    position: [53.2862, -6.3641],
    ambulanceId: "dfb31",
    candidateHospitalIds: ["tuh", "stjames"],
    pathways: ["Scenario A: nearest-hospital pathway", "Scenario B: flow-aware pathway"],
    dfbStationArea: "Tallaght Fire Station",
  },
];

export const DEFAULT_INCIDENT_ID = INCIDENTS[0].id;

export function incidentById(id: string): Incident {
  return INCIDENTS.find((incident) => incident.id === id) ?? INCIDENTS[0];
}

export function ambulanceById(id: string): Ambulance | undefined {
  return AMBULANCES.find((ambulance) => ambulance.id === id);
}
