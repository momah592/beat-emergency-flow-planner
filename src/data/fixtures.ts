import type { HistoricDemandContext, ScenarioEvidence } from "../domain/types";
import { sources, tripsSample } from "./sourceRegistry";

const now = "2026-10-04T10:30:00Z";
const tripsSampleSavedAt = "2026-10-04T13:23:00Z";

const sampleCaveat = (route: number, links: number) =>
  `${tripsSample.label} (saved 4 Oct 2026): TRIPS route ${route} direction 1 (${tripsSample.proxyLabel}), accumulated travel time over ${links} links at source timestamp ${tripsSample.rawTimestamp}. ` +
  "The source gives no timezone, so only the date is recorded as observedAt; freshnessSeconds is not available. This is historical data, not current or live.";

export const scenarios: Record<"a" | "b", ScenarioEvidence> = {
  a: {
    scenario: { id: "a", name: "Scenario A", declaredCorridor: "Dublin 2 to northbound corridor", namedHospital: "Declared pathway A" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: tripsSampleSavedAt, observedAt: tripsSample.observedDate, caveat: sampleCaveat(16, 6), data: { corridor: "TRIPS route 16 (provisional proxy corridor)", direction: "Direction 1", journeyMinutes: 2.4 } },
    crowding: { source: sources.inmo.name, sourceUrl: sources.inmo.url, status: "replayed", retrievedAt: now, observedAt: "2026-10-04T08:00:00Z", caveat: "Daily patients-waiting-for-beds context; not ED wait time or capacity.", data: { hospital: "Declared pathway A", patientsWaitingForBeds: 32, publishedDate: "2026-10-04" } },
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: now, caveat: "GTFS Realtime API key not configured. This is not used as a road-speed estimate." },
  },
  b: {
    scenario: { id: "b", name: "Scenario B", declaredCorridor: "Dublin 2 to westbound corridor", namedHospital: "Declared pathway B" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: tripsSampleSavedAt, observedAt: tripsSample.observedDate, caveat: sampleCaveat(37, 7), data: { corridor: "TRIPS route 37 (provisional proxy corridor)", direction: "Direction 1", journeyMinutes: 18.3 } },
    crowding: { source: sources.inmo.name, sourceUrl: sources.inmo.url, status: "replayed", retrievedAt: now, observedAt: "2026-10-04T08:00:00Z", caveat: "Daily patients-waiting-for-beds context; not ED wait time or capacity.", data: { hospital: "Declared pathway B", patientsWaitingForBeds: 18, publishedDate: "2026-10-04" } },
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: now, caveat: "GTFS Realtime API key not configured. This is not used as a road-speed estimate." },
  },
};

export const dfbContext: HistoricDemandContext = {
  area: "Dublin 2",
  note: "Historical DFB context placeholder. Replace only with a documented aggregate from the public dataset; it is not live incident demand.",
};

