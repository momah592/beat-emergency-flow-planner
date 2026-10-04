import type { HistoricDemandContext, ScenarioEvidence } from "../domain/types";
import { sources } from "./sourceRegistry";

const now = "2026-10-04T10:30:00Z";

export const scenarios: Record<"a" | "b", ScenarioEvidence> = {
  a: {
    scenario: { id: "a", name: "Scenario A", declaredCorridor: "Dublin 2 to northbound corridor", namedHospital: "Declared pathway A" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: now, observedAt: "2026-10-04T10:29:00Z", freshnessSeconds: 60, caveat: "Saved public-data-shaped fixture for the prototype.", data: { corridor: "Dublin 2 to northbound corridor", direction: "Northbound", journeyMinutes: 14 } },
    crowding: { source: sources.inmo.name, sourceUrl: sources.inmo.url, status: "replayed", retrievedAt: now, observedAt: "2026-10-04T08:00:00Z", caveat: "Daily patients-waiting-for-beds context; not ED wait time or capacity.", data: { hospital: "Declared pathway A", patientsWaitingForBeds: 32, publishedDate: "2026-10-04" } },
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: now, caveat: "GTFS Realtime API key not configured. This is not used as a road-speed estimate." },
  },
  b: {
    scenario: { id: "b", name: "Scenario B", declaredCorridor: "Dublin 2 to westbound corridor", namedHospital: "Declared pathway B" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: now, observedAt: "2026-10-04T10:29:00Z", freshnessSeconds: 60, caveat: "Saved public-data-shaped fixture for the prototype.", data: { corridor: "Dublin 2 to westbound corridor", direction: "Westbound", journeyMinutes: 19 } },
    crowding: { source: sources.inmo.name, sourceUrl: sources.inmo.url, status: "replayed", retrievedAt: now, observedAt: "2026-10-04T08:00:00Z", caveat: "Daily patients-waiting-for-beds context; not ED wait time or capacity.", data: { hospital: "Declared pathway B", patientsWaitingForBeds: 18, publishedDate: "2026-10-04" } },
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: now, caveat: "GTFS Realtime API key not configured. This is not used as a road-speed estimate." },
  },
};

export const dfbContext: HistoricDemandContext = {
  area: "Dublin 2",
  note: "Historical DFB context placeholder. Replace only with a documented aggregate from the public dataset; it is not live incident demand.",
};


/**
 * The declared Scenario A/B inputs, split out from their evidence so the UI can
 * hold and later edit the declaration without importing evidence or adapters.
 */
export const declaredScenarios = {
  a: scenarios.a.scenario,
  b: scenarios.b.scenario,
} as const;
