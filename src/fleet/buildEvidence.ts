import { loadScenarioEvidence } from "../data/loadScenarioEvidence";
import { sources } from "../data/sourceRegistry";
import type { CrowdingContext, EvidenceEnvelope, Scenario, ScenarioEvidence } from "../domain/types";
import { HOSPITALS } from "./fixtures";
import type { Incident, LatLng } from "./types";

const NO_SOURCE_CAVEAT =
  "No DCC TRIPS corridor or published INMO figure is mapped to this hospital yet, so no observed value is shown. Nothing is estimated in its place.";

function unavailable<T>(source: { name: string; url: string }, retrievedAt: string): EvidenceEnvelope<T> {
  return { source: source.name, sourceUrl: source.url, status: "unavailable", retrievedAt, caveat: NO_SOURCE_CAVEAT };
}

/**
 * Builds the evidence for one candidate hospital.
 *
 * Where a hospital is mapped to a scenario slot, the evidence comes from the
 * data layer's loadScenarioEvidence: live DCC TRIPS when the feed is reachable,
 * the saved public-data snapshot otherwise. Where it is not mapped, every layer
 * is returned as unavailable. No journey time or trolley count originates here.
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

  if (!hospital.dataSlot) {
    const retrievedAt = new Date().toISOString();
    return {
      scenario,
      traffic: unavailable(sources.trips, retrievedAt),
      crowding: unavailable(sources.inmo, retrievedAt),
      transit: unavailable(sources.gtfs, retrievedAt),
    };
  }

  // The data layer is keyed by scenario slot, so ask it for the slot that holds
  // this hospital's corridor and then present it under the comparison slot.
  const evidence = await loadScenarioEvidence({ ...scenario, id: hospital.dataSlot });
  const note = incident.corridorNote;
  const traffic = note && evidence.traffic.status !== "unavailable"
    ? { ...evidence.traffic, caveat: `${note} ${evidence.traffic.caveat}` }
    : evidence.traffic;

  // A slot's crowding figure belongs to the hospital it was published for. If this hospital
  // is not that one, show it as unavailable rather than another hospital's number.
  const crowding = evidence.crowding.data && evidence.crowding.data.hospital !== hospital.name
    ? {
        ...unavailable<CrowdingContext>(sources.inmo, evidence.crowding.retrievedAt),
        caveat: `No INMO Trolley Watch figure is captured for ${hospital.name}, so no bed-wait context is shown for this pathway. Not estimated.`,
      }
    : evidence.crowding;

  return { ...evidence, scenario, traffic, crowding };
}

/** Compass direction from scene to hospital, for map labelling only. */
export function bearing(from: LatLng, to: LatLng): string {
  return `${to[0] > from[0] ? "North" : "South"}${to[1] > from[1] ? "east" : "west"}bound`;
}
