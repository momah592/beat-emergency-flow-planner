import type { ComparisonResult } from "../domain/types";

export function createPlanningBrief(result: ComparisonResult): string {
  const [a, b] = result.scenarios;
  const roadSentence = result.trafficLead
    ? `${result.trafficLead === "a" ? a.scenario.name : b.scenario.name} has the shorter observed declared-corridor journey time by ${result.trafficDeltaMinutes} minutes.`
    : "No comparable observed corridor journey time is available.";
  const crowdingSentence = typeof result.crowdingDifference === "number"
    ? `${a.scenario.name} and ${b.scenario.name} have different published bed-wait contexts. This is not ED waiting-time or capacity data.`
    : "Published bed-wait context is unavailable for one or both declared pathways.";

  return [
    "Simulated planning brief",
    roadSentence,
    crowdingSentence,
    `Confidence: ${result.confidence}.`,
    "This comparison is for planning review only. It is not a dispatch, destination, triage or clinical recommendation.",
  ].join(" ");
}

