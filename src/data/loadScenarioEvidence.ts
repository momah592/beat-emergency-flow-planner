import type { Scenario, ScenarioEvidence } from "../domain/types";
import { getTrafficContext } from "./adapters";
import { scenarios } from "./fixtures";

/**
 * The data boundary. Never throws and never invents values: traffic is live DCC
 * TRIPS when reachable, otherwise the replayed fixture. Crowding and transit are
 * fixture-only for now (transit is an explicit "unavailable" envelope).
 */
export async function loadScenarioEvidence(scenario: Scenario): Promise<ScenarioEvidence> {
  const fixture = scenarios[scenario.id];
  try {
    const traffic = await getTrafficContext(scenario.id);
    return { ...fixture, scenario, traffic };
  } catch {
    return { ...fixture, scenario };
  }
}
