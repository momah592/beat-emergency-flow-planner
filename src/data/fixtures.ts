import type { CrowdingContext, EvidenceEnvelope, HistoricDemandContext, ScenarioEvidence } from "../domain/types";
import dfbAggregate from "../../fixtures/dfb-aggregate.json";
import inmoSnapshot from "../../fixtures/inmo-snapshot.json";
import { sources, tripsSample } from "./sourceRegistry";

const transitSavedAt = "2026-10-04T14:20:00Z";
const tripsSampleSavedAt = "2026-10-04T13:23:00Z";

const sampleCaveat = (route: number, links: number) =>
  `${tripsSample.label} (saved 4 Oct 2026): TRIPS route ${route} direction 1 (${tripsSample.proxyLabel}), accumulated travel time over ${links} links at source timestamp ${tripsSample.rawTimestamp}. ` +
  "The source gives no timezone, so only the date is recorded as observedAt; freshnessSeconds is not available. This is historical data, not current or live.";

const inmoCounts = inmoSnapshot.hospitals as Record<string, { trolley: number; ward: number }>;

/**
 * Published bed-wait context for one hospital from the saved INMO snapshot
 * (fixtures/inmo-snapshot.json). A hospital missing from the snapshot is "unavailable", never estimated.
 */
export function inmoEnvelopeFor(hospital: string): EvidenceEnvelope<CrowdingContext> {
  const counts = inmoCounts[hospital];
  const base = { source: sources.inmo.name, sourceUrl: sources.inmo.url, retrievedAt: inmoSnapshot.savedAt };
  if (!counts) {
    return {
      ...base,
      status: "unavailable",
      caveat: `No INMO Trolley Watch figure is captured for ${hospital}, so no bed-wait context is shown for this pathway. Not estimated.`,
    };
  }
  return {
    ...base,
    status: "replayed",
    observedAt: inmoSnapshot.publishedDate,
    caveat: `Published INMO bed-wait context (patients waiting for beds, trolley + ward) for ${inmoSnapshot.publishedDate}, saved from INMO Trolley Watch. Not ED wait time or capacity. Split as published: trolley ${counts.trolley}, ward ${counts.ward}.`,
    data: { hospital, patientsWaitingForBeds: counts.trolley + counts.ward, publishedDate: inmoSnapshot.publishedDate },
  };
}

export const scenarios: Record<"a" | "b", ScenarioEvidence> = {
  a: {
    scenario: { id: "a", name: "Scenario A", declaredCorridor: "Dublin 2 to northbound corridor", namedHospital: "Beaumont Hospital" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: tripsSampleSavedAt, observedAt: tripsSample.observedDate, caveat: sampleCaveat(16, 6), data: { corridor: "TRIPS route 16 (provisional proxy corridor)", direction: "Direction 1", journeyMinutes: 2.4 } },
    crowding: inmoEnvelopeFor("Beaumont Hospital"),
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: transitSavedAt, caveat: "No NTA GTFS-R reading captured in this saved fixture, so transit context is not shown. Never used as a road-speed or congestion estimate." },
  },
  b: {
    scenario: { id: "b", name: "Scenario B", declaredCorridor: "Dublin 2 to westbound corridor", namedHospital: "St James's Hospital" },
    traffic: { source: sources.trips.name, sourceUrl: sources.trips.url, status: "replayed", retrievedAt: tripsSampleSavedAt, observedAt: tripsSample.observedDate, caveat: sampleCaveat(37, 7), data: { corridor: "TRIPS route 37 (provisional proxy corridor)", direction: "Direction 1", journeyMinutes: 18.3 } },
    crowding: inmoEnvelopeFor("St James's Hospital"),
    transit: { source: sources.gtfs.name, sourceUrl: sources.gtfs.url, status: "unavailable", retrievedAt: transitSavedAt, caveat: "No NTA GTFS-R reading captured in this saved fixture, so transit context is not shown. Never used as a road-speed or congestion estimate." },
  },
};

export const dfbContext: HistoricDemandContext = {
  area: "All DFB station areas",
  note: dfbAggregate.caveat,
};

const dfbSavedAt = "2026-10-04T15:10:00+01:00";
const nf = (n: number) => n.toLocaleString("en-IE");

/** Saved DFB aggregate as an envelope. Historical context only, never live demand. */
export function dfbEnvelope(stationArea?: string): EvidenceEnvelope<HistoricDemandContext> {
  const byArea = dfbAggregate.incidentsByStationArea as Record<string, number>;
  const count = stationArea ? byArea[stationArea] : undefined;
  const area = stationArea && count !== undefined
    ? `${stationArea}: ${nf(count)} of ${nf(dfbAggregate.totalIncidents)} ambulance incidents`
    : `All DFB station areas: ${nf(dfbAggregate.totalIncidents)} ambulance incidents`;
  return {
    source: sources.dfb.name,
    sourceUrl: sources.dfb.url,
    status: "replayed",
    retrievedAt: dfbSavedAt,
    caveat: dfbAggregate.caveat,
    data: { area, note: `${dfbAggregate.dateRange.from} to ${dfbAggregate.dateRange.to}. Historical context, not live demand.` },
  };
}
