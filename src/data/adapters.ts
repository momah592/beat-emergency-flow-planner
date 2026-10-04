import type { EvidenceEnvelope, TrafficContext } from "../domain/types";
import { scenarios } from "./fixtures";

/**
 * Replace this fixture adapter with the DCC TRIPS fetch once the team confirms
 * the source response shape. The return contract is intentionally stable.
 */
export async function getTrafficContext(scenarioId: "a" | "b"): Promise<EvidenceEnvelope<TrafficContext>> {
  return scenarios[scenarioId].traffic;
}

