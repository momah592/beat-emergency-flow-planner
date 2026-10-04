import type { Ambulance, Hospital, Incident } from "./types";

/**
 * Public-data-shaped fixtures for the fleet layer.
 *
 * Journey minutes stand in for DCC TRIPS corridor observations until P1's
 * adapter lands. Trolley counts are INMO-shaped daily published figures.
 * Nothing here is invented at runtime: if a feed fails, the UI shows the
 * unavailable state rather than falling back to a guess.
 */

export const HOSPITALS: Record<string, Hospital> = {
  mater: { id: "mater", name: "Mater Misericordiae University Hospital", shortName: "Mater", position: [53.3597, -6.2659], trolleyCount: 32 },
  stjames: { id: "stjames", name: "St James's Hospital", shortName: "St James's", position: [53.3414, -6.2954], trolleyCount: 18 },
  beaumont: { id: "beaumont", name: "Beaumont Hospital", shortName: "Beaumont", position: [53.3889, -6.2297], trolleyCount: 41 },
  vincents: { id: "vincents", name: "St Vincent's University Hospital", shortName: "St Vincent's", position: [53.3157, -6.2114], trolleyCount: 25 },
};

export const AMBULANCES: Ambulance[] = [
  { id: "dfb11", callsign: "DFB 11", position: [53.342, -6.26], status: "on scene" },
  { id: "dfb23", callsign: "DFB 23", position: [53.347, -6.232], status: "on scene" },
  { id: "dfb07", callsign: "DFB 07", position: [53.351, -6.258], status: "available" },
  { id: "dfb15", callsign: "DFB 15", position: [53.333, -6.265], status: "available" },
  { id: "dfb04", callsign: "DFB 04", position: [53.3465, -6.294], status: "on scene" },
];

export const INCIDENTS: Incident[] = [
  {
    id: "grafton",
    label: "Grafton Street",
    area: "Dublin 2",
    position: [53.342, -6.26],
    ambulanceId: "dfb11",
    candidateHospitalIds: ["mater", "stjames"],
    journeyMinutes: { mater: 11, stjames: 14 },
  },
  {
    id: "docklands",
    label: "Docklands",
    area: "Dublin 1",
    position: [53.347, -6.232],
    ambulanceId: "dfb23",
    candidateHospitalIds: ["mater", "vincents"],
    journeyMinutes: { mater: 16, vincents: 12 },
  },
  {
    id: "heuston",
    label: "Heuston",
    area: "Dublin 8",
    position: [53.3465, -6.294],
    ambulanceId: "dfb04",
    candidateHospitalIds: ["stjames", "mater"],
    journeyMinutes: { stjames: 6, mater: 13 },
  },
];

export const DEFAULT_INCIDENT_ID = INCIDENTS[0].id;

export function incidentById(id: string): Incident {
  return INCIDENTS.find((incident) => incident.id === id) ?? INCIDENTS[0];
}

export function ambulanceById(id: string): Ambulance | undefined {
  return AMBULANCES.find((ambulance) => ambulance.id === id);
}
