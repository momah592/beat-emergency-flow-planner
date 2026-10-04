import type { ComparisonResult, ScenarioEvidence } from "./types";

export function compareScenarios(a: ScenarioEvidence, b: ScenarioEvidence): ComparisonResult {
  const caveats = [a.traffic, b.traffic, a.crowding, b.crowding, a.transit, b.transit]
    .filter((item) => item.status !== "live")
    .map((item) => `${item.source}: ${item.caveat}`);

  const aTraffic = a.traffic.data;
  const bTraffic = b.traffic.data;
  const aCrowding = a.crowding.data;
  const bCrowding = b.crowding.data;
  const trafficAvailable = aTraffic !== undefined && bTraffic !== undefined;
  const crowdingAvailable = aCrowding !== undefined && bCrowding !== undefined;

  const trafficLead = trafficAvailable
      ? aTraffic!.journeyMinutes === bTraffic!.journeyMinutes
        ? undefined
      : aTraffic!.journeyMinutes < bTraffic!.journeyMinutes
        ? "a"
        : "b"
    : undefined;

  const freshTraffic = [a.traffic, b.traffic].every((item) => item.status === "live" && (item.freshnessSeconds ?? Infinity) < 300);
  const confidence = trafficAvailable && crowdingAvailable && freshTraffic
    ? "high"
    : trafficAvailable
      ? "limited"
      : "insufficient";

  return {
    scenarios: [a, b],
    trafficLead,
    trafficDeltaMinutes: trafficAvailable ? Math.abs(aTraffic!.journeyMinutes - bTraffic!.journeyMinutes) : undefined,
    crowdingDifference: crowdingAvailable
      ? aCrowding!.patientsWaitingForBeds - bCrowding!.patientsWaitingForBeds
      : undefined,
    confidence,
    caveats,
  };
}

