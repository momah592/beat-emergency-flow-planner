import { useEffect, useState } from "react";
import { dfbEnvelope } from "../data/fixtures";
import { compareScenarios } from "../domain/compareScenarios";
import type { ComparisonResult } from "../domain/types";
import { buildScenarioEvidence } from "../fleet/buildEvidence";
import { incidentById } from "../fleet/fixtures";
import type { Incident } from "../fleet/types";

export type ComparisonState =
  | { phase: "loading" }
  | { phase: "ready"; incident: Incident; result: ComparisonResult }
  | { phase: "error"; message: string };

/**
 * The single UI boundary. App.tsx consumes only this, so the fleet layer and
 * the comparison engine can change without touching components.
 */
export function useComparison(incidentId: string): ComparisonState {
  const [state, setState] = useState<ComparisonState>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    setState({ phase: "loading" });

    const load = async () => {
      const incident = incidentById(incidentId);
      const [first, second] = incident.candidateHospitalIds;
      const [a, b] = await Promise.all([
        buildScenarioEvidence(incident, first, "a"),
        buildScenarioEvidence(incident, second, "b"),
      ]);
      return { incident, result: compareScenarios(a, b, { historicDemand: dfbEnvelope(incident.dfbStationArea) }) };
    };

    load()
      .then(({ incident, result }) => {
        if (!active) return;
        setState({ phase: "ready", incident, result });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          phase: "error",
          message: error instanceof Error ? error.message : "Evidence could not be loaded.",
        });
      });

    return () => {
      active = false;
    };
  }, [incidentId]);

  return state;
}
