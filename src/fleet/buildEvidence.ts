import { sources } from "../data/sourceRegistry";
import type { ScenarioEvidence } from "../domain/types";
import { HOSPITALS } from "./fixtures";
import type { Incident, LatLng } from "./types";

const RETRIEVED_AT = "2026-10-04T10:30:00Z";
const OBSERVED_AT = "2026-10-04T10:29:00Z";
const TROLLEY_PUBLISHED = "2026-10-04";

/**
 * Turns one incident plus one candidate hospital into the ScenarioEvidence the
 * comparison engine already understands, so the fleet layer sits on top of
 * src/domain without changing it.
 */
export function buildScenarioEvidence(incident: Incident, hospitalId: string, slot: "a" | "b"): ScenarioEvidence {
  const hospital = HOSPITALS[hospitalId];
  const minutes = incident.journeyMinutes[hospitalId];
  const corridor = `${incident.label} to ${hospital.shortName}`;

  return {
    scenario: {
      id: slot,
      name: hospital.shortName,
      declaredCorridor: corridor,
      namedHospital: hospital.name,
    },
    traffic: {
      source: sources.trips.name,
      sourceUrl: sources.trips.url,
      status: "replayed",
      retrievedAt: RETRIEVED_AT,
      observedAt: OBSERVED_AT,
      freshnessSeconds: 60,
      caveat: "Saved public-data-shaped corridor observation. General traffic, not a blue-light estimate.",
      data: minutes === undefined ? undefined : { corridor, direction: bearing(incident.position, hospital.position), journeyMinutes: minutes },
    },
    crowding: {
      source: sources.inmo.name,
      sourceUrl: sources.inmo.url,
      status: "replayed",
      retrievedAt: RETRIEVED_AT,
      observedAt: "2026-10-04T08:00:00Z",
      caveat: "Published daily trolley count. Not an ED waiting time and not live capacity.",
      data: { hospital: hospital.name, patientsWaitingForBeds: hospital.trolleyCount, publishedDate: TROLLEY_PUBLISHED },
    },
    transit: {
      source: sources.gtfs.name,
      sourceUrl: sources.gtfs.url,
      status: "unavailable",
      retrievedAt: RETRIEVED_AT,
      caveat: "GTFS Realtime API key not configured. This is not used as a road-speed estimate.",
    },
  };
}

/** Compass direction from scene to hospital, for the evidence label only. */
function bearing(from: LatLng, to: LatLng): string {
  const northSouth = to[0] > from[0] ? "North" : "South";
  const eastWest = to[1] > from[1] ? "east" : "west";
  return `${northSouth}${eastWest}bound`;
}
