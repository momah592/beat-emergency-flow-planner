import type { EvidenceEnvelope, Scenario, ScenarioEvidence } from "../domain/types";
import { getTrafficContext } from "./adapters";
import { scenarios } from "./fixtures";
import { sources } from "./sourceRegistry";

function unavailable<T>(source: { name: string; url: string }, caveat: string): EvidenceEnvelope<T> {
  return { source: source.name, sourceUrl: source.url, status: "unavailable", retrievedAt: new Date().toISOString(), caveat };
}

/**
 * The data boundary. Never throws and never invents values: traffic is live DCC
 * TRIPS when reachable, otherwise the replayed fixture. Crowding and transit are
 * fixture-only for now (transit is an explicit "unavailable" envelope). A scenario
 * id with no fixture gets "unavailable" envelopes for every layer.
 */
export async function loadScenarioEvidence(scenario: Scenario): Promise<ScenarioEvidence> {
  const fixture = scenarios[scenario.id];
  if (!fixture) {
    const caveat = `No evidence is configured for scenario "${String(scenario.id)}".`;
    return {
      scenario,
      traffic: unavailable(sources.trips, caveat),
      crowding: unavailable(sources.inmo, caveat),
      transit: unavailable(sources.gtfs, caveat),
    };
  }
  try {
    const traffic = await getTrafficContext(scenario.id);
    return { ...fixture, scenario, traffic };
  } catch {
    return { ...fixture, scenario };
  }
}
