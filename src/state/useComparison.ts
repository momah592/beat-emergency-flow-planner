import { useEffect, useState } from "react";
import { loadScenarioEvidence } from "../data/loadScenarioEvidence";
import { compareScenarios } from "../domain/compareScenarios";
import type { ComparisonResult, Scenario } from "../domain/types";

export type ComparisonState =
  | { phase: "loading" }
  | { phase: "ready"; result: ComparisonResult }
  | { phase: "error"; message: string };

/** Loads evidence for both declared scenarios through the data boundary, then compares them. */
export function useComparison(a: Scenario, b: Scenario): ComparisonState {
  const [state, setState] = useState<ComparisonState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    Promise.all([loadScenarioEvidence(a), loadScenarioEvidence(b)])
      .then(([evidenceA, evidenceB]) => {
        if (!cancelled) setState({ phase: "ready", result: compareScenarios(evidenceA, evidenceB) });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ phase: "error", message: error instanceof Error ? error.message : "Evidence could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, [a, b]);

  return state;
}
