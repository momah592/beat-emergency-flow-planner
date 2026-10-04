import type { Scenario, ScenarioEvidence } from "../domain/types";
import { getTrafficContext } from "./adapters";
import { scenarios } from "./fixtures";

/**
 * The single data boundary for the app. Owned by P1 (data adapters).
 *
 * Contract: never throws, never invents a value. On any failure it degrades to
 * the saved fixture envelope, which is already marked `status: "replayed"`.
 * Callers therefore never need a try/catch, and the demo renders with wifi off.
 *
 * P1 replaces one layer at a time: as each adapter lands, swap it in below and
 * leave the others reading from the fixture.
 */
export async function loadScenarioEvidence(scenario: Scenario): Promise<ScenarioEvidence> {
  const fallback = scenarios[scenario.id];

  try {
    const traffic = await getTrafficContext(scenario.id);
    return { ...fallback, scenario, traffic };
  } catch {
    return { ...fallback, scenario };
  }
}
