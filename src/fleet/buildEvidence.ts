import { getPathwayTraffic, getTransitContext } from "../data/adapters";
import { inmoEnvelopeFor } from "../data/fixtures";
import { sources } from "../data/sourceRegistry";
import { savedPathway } from "../data/tripsCorridor";
import type { EvidenceEnvelope, Scenario, ScenarioEvidence, TrafficContext } from "../domain/types";
import { HOSPITALS } from "./fixtures";
import type { Incident, LatLng } from "./types";

const noRoute = (): EvidenceEnvelope<TrafficContext> => ({
  source: sources.trips.name,
  sourceUrl: sources.trips.url,
  status: "unavailable",
  retrievedAt: new Date().toISOString(),
  caveat: "No saved road route exists for this pathway, so no DCC TRIPS links can be matched to it. Nothing is estimated in its place.",
});

/**
 * Builds the evidence for one candidate hospital.
 *
 * Road context is the observed speed on the DCC TRIPS links along the pathway's saved road route
 * (live when the feed is reachable, the saved snapshot otherwise). Crowding is the saved INMO figure
 * for this exact hospital. Transit is the network-wide NTA feed. No figure originates here.
 */
export async function buildScenarioEvidence(
  incident: Incident,
  hospitalId: string,
  slot: "a" | "b",
): Promise<ScenarioEvidence> {
  const hospital = HOSPITALS[hospitalId];
  const scenario: Scenario = {
    id: slot,
    name: incident.pathways?.[slot === "a" ? 0 : 1] ?? hospital.shortName,
    declaredCorridor: `${incident.label} incident to ${hospital.name}`,
    namedHospital: hospital.name,
  };

  const path = savedPathway(incident.id, hospitalId);
  const [traffic, transit] = await Promise.all([path ? getPathwayTraffic(path) : Promise.resolve(noRoute()), getTransitContext()]);

  return { scenario, traffic, crowding: inmoEnvelopeFor(hospital.name), transit };
}

/** Compass direction from scene to hospital, for map labelling only. */
export function bearing(from: LatLng, to: LatLng): string {
  return `${to[0] > from[0] ? "North" : "South"}${to[1] > from[1] ? "east" : "west"}bound`;
}
