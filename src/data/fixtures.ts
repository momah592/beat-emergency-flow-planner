import type { EvidenceEnvelope, CrowdingContext, HistoricDemandContext, ScenarioEvidence } from "../domain/types";
import dfbAggregate from "../../fixtures/dfb-aggregate.json";
import { sources, tripsSample } from "./sourceRegistry";

const transitSavedAt = "2026-10-04T14:20:00Z";
const inmoSavedAt = "2026-10-04T14:16:00Z";
const inmoObservedDate = "2026-10-02";
const inmoCaveat = (trolley: number, ward: number) =>
  `Published INMO bed-wait context (patients waiting for beds, trolley + ward) for 2 Oct 2026, saved 4 Oct 2026 from INMO Trolley Watch. Not ED wait time or capacity. Split as published: trolley ${trolley}, ward ${ward}.`;
const tripsSampleSavedAt = "2026-10-04T13:23:00Z";

const sampleCaveat = (route: number, links: number) =>
  `${tripsSample.label} (saved 4 Oct 2026): TRIPS route ${route} direction 1 (${tripsSample.proxyLabel}), accumulated travel time over ${links} links at source timestamp ${tripsSample.rawTimestamp}. ` +
  "The source gives no timezone, so only the date is recorded as observedAt; freshnessSeconds is not available. This is historical data, not current or live.";

/** The fixed simulated incident. Not a real call; no patient information is modelled. */
export const incident = {
  title: "Simulated high-acuity incident, Tallaght",
  location: "Tallaght, Dublin 24",
  note: "Fixed demonstration scene. Nothing here is a real incident, call or dispatch.",
} as const;

const tuhCrowdingUnavailable: EvidenceEnvelope<CrowdingContext> = {
  source: sources.inmo.name,
  sourceUrl: sources.inmo.url,
  status: "unavailable",
  retrievedAt: inmoSavedAt,
  caveat: "No INMO Trolley Watch figure for Tallaght University Hospital is captured in this saved snapshot, so no bed-wait context is shown for this pathway. Not estimated.",
};

export const scenarios: Record<"a" | "b", ScenarioEvidence> = {
  a: {
    scenario: { id: "a", name: "Scenario A: nearest-hospital pathway", declaredCorridor: "Tallaght incident to the nearest named hospital pathway (Tallaght University Hospital)", namedHospital: "Tallaght University Hospital" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: tripsSampleSavedAt, observedAt: tripsSample.observedDate, caveat: sampleCaveat(16, 6), data: { corridor: "TRIPS route 16 (provisional proxy corridor)", direction: "Direction 1", journeyMinutes: 2.4 } },
    crowding: tuhCrowdingUnavailable,
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: transitSavedAt, caveat: "No NTA GTFS-R reading captured in this saved fixture, so transit context is not shown. Never used as a road-speed or congestion estimate." },
  },
  b: {
    scenario: { id: "b", name: "Scenario B: flow-aware pathway", declaredCorridor: "Tallaght incident to an alternate declared pathway (St James's Hospital)", namedHospital: "St James's Hospital" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: tripsSampleSavedAt, observedAt: tripsSample.observedDate, caveat: sampleCaveat(37, 7), data: { corridor: "TRIPS route 37 (provisional proxy corridor)", direction: "Direction 1", journeyMinutes: 18.3 } },
    crowding: { source: sources.inmo.name, sourceUrl: sources.inmo.url, status: "replayed", retrievedAt: inmoSavedAt, observedAt: inmoObservedDate, caveat: inmoCaveat(10, 0), data: { hospital: "St James's Hospital", patientsWaitingForBeds: 10, publishedDate: inmoObservedDate } },
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: transitSavedAt, caveat: "No NTA GTFS-R reading captured in this saved fixture, so transit context is not shown. Never used as a road-speed or congestion estimate." },
  },
};

export const dfbContext: HistoricDemandContext = {
  area: "All DFB station areas",
  note: dfbAggregate.caveat,
};

/** Tallaght fire-station area share of the 2025 DFB aggregate, shown as historical context only. */
export const dfbTallaght = {
  stationArea: "Tallaght Fire Station",
  incidents: dfbAggregate.incidentsByStationArea["Tallaght Fire Station"],
  total: dfbAggregate.totalIncidents,
  from: dfbAggregate.dateRange.from,
  to: dfbAggregate.dateRange.to,
  source: dfbAggregate.source,
  sourceUrl: dfbAggregate.sourceUrl,
  caveat: dfbAggregate.caveat,
};
