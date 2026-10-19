import type { CrowdingContext, EvidenceEnvelope, HistoricDemandContext, ScenarioEvidence, TransitContext } from "../domain/types";
import dfbAggregate from "../../fixtures/dfb-aggregate.json";
import inmoSnapshot from "../../fixtures/inmo-snapshot.json";
import { savedTripsEnvelope } from "./adapters";
import { sources } from "./sourceRegistry";
import { savedPathway } from "./tripsCorridor";

const transitSavedAt = "2026-10-04T14:20:00Z";

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

const transitUnavailable = (): EvidenceEnvelope<TransitContext> => ({
  source: sources.gtfs.name,
  sourceUrl: sources.gtfs.url,
  status: "unavailable",
  retrievedAt: transitSavedAt,
  caveat: "No NTA GTFS-R reading captured in this saved fixture, so transit context is not shown. Never used as a road-speed or congestion estimate.",
});

function savedScenario(id: "a" | "b", name: string, hospital: string, hospitalId: string): ScenarioEvidence {
  return {
    scenario: { id, name, declaredCorridor: `St Stephen's Green to ${hospital}`, namedHospital: hospital },
    traffic: savedTripsEnvelope(savedPathway("dublin2", hospitalId)!, "saved demonstration"),
    crowding: inmoEnvelopeFor(hospital),
    transit: transitUnavailable(),
  };
}

/**
 * Fully saved evidence for the two St Stephen's Green pathways, computed from the saved TRIPS snapshot
 * and saved routes. Used by tests and as a reference for the replayed state. No live data.
 */
export const scenarios: Record<"a" | "b", ScenarioEvidence> = {
  a: savedScenario("a", "Scenario A", "Beaumont Hospital", "beaumont"),
  b: savedScenario("b", "Scenario B", "St James's Hospital", "stjames"),
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
