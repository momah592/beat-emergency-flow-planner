import { loadScenarioEvidence } from "../data/loadScenarioEvidence";
import { sources } from "../data/sourceRegistry";
import type { EvidenceEnvelope, Scenario, ScenarioEvidence } from "../domain/types";
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
    name: hospital.shortName,
    declaredCorridor: `${incident.label} to ${hospital.shortName}`,
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
  return { ...evidence, scenario };
}

/** Compass direction from scene to hospital, for map labelling only. */
export function bearing(from: LatLng, to: LatLng): string {
  return `${to[0] > from[0] ? "North" : "South"}${to[1] > from[1] ? "east" : "west"}bound`;
}
