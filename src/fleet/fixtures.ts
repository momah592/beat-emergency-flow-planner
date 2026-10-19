import type { Ambulance, Hospital, Incident } from "./types";

/**
 * Fleet layer.
 *
 * Hospitals and incidents are only declared here when a public source actually
 * backs them. `dataSlot` points at the scenario in src/data/fixtures.ts whose
 * live DCC TRIPS corridor and published INMO figure describe that pathway; a
 * hospital without one has no evidence and the UI shows it as unavailable
 * rather than inventing a number.
 *
 * Ambulance positions are simulated: no public feed publishes live unit
 * locations, and the UI labels them as such.
 */

export const HOSPITALS: Record<string, Hospital> = {
  beaumont: {
    id: "beaumont",
    name: "Beaumont Hospital",
    shortName: "Beaumont",
    position: [53.3889, -6.2297],
    dataSlot: "a",
  },
  stjames: {
    id: "stjames",
    name: "St James's Hospital",
    shortName: "St James's",
    position: [53.3414, -6.2954],
    dataSlot: "b",
  },
  tuh: {
    id: "tuh",
    name: "Tallaght University Hospital",
    shortName: "Tallaght University Hospital",
    position: [53.2886, -6.3787],
    // Traffic uses the saved proxy corridor in slot "a". Crowding is looked up by hospital name in
    // fixtures/inmo-snapshot.json, so it stays unavailable until a figure for this hospital is added.
    dataSlot: "a",
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
    id: "tallaght",
    label: "Tallaght",
    area: "Dublin 24",
    position: [53.2862, -6.3641],
    ambulanceId: "dfb31",
    candidateHospitalIds: ["tuh", "stjames"],
    pathways: ["Scenario A: nearest-hospital pathway", "Scenario B: flow-aware pathway"],
    corridorNote:
      "Demonstration stand-in: this saved Dublin city-centre TRIPS corridor is not measured on a Tallaght route.",
    dfbStationArea: "Tallaght Fire Station",
  },
  {
    id: "dublin2",
    label: "St Stephen's Green",
    area: "Dublin 2",
    position: [53.3382, -6.2591],
    ambulanceId: "dfb11",
    candidateHospitalIds: ["beaumont", "stjames"],
  },
];

export const DEFAULT_INCIDENT_ID = INCIDENTS[0].id;

export function incidentById(id: string): Incident {
  return INCIDENTS.find((incident) => incident.id === id) ?? INCIDENTS[0];
}

export function ambulanceById(id: string): Ambulance | undefined {
  return AMBULANCES.find((ambulance) => ambulance.id === id);
}
