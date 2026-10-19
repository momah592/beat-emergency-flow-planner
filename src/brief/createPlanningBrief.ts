import type { ComparisonResult, EvidenceEnvelope } from "../domain/types";

export type BriefClaim = { text: string; citation: string };

export type PlanningBrief = {
  title: string;
  abstained: boolean;
  summary: string;
  claims: BriefClaim[];
  uncertainty: string[];
  boundary: string;
};

const BOUNDARY =
  "This is a simulated planning comparison for review only. It is not a dispatch, destination, triage or clinical recommendation. Final decisions rest with dispatch and clinical teams.";

const stamp = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";

function cite(evidence: EvidenceEnvelope<unknown>): string {
  const observed = evidence.observedAt ? `observed ${evidence.observedAt}` : "observation time not supplied";
  return `${evidence.source}, ${evidence.status}, ${observed}, retrieved ${stamp(evidence.retrievedAt)}`;
}

/** Explains a structured ComparisonResult. Computes nothing new; abstains when traffic evidence is missing. */
export function createPlanningBrief(result: ComparisonResult): PlanningBrief {
  const [a, b] = result.scenarios;
  const uncertainty = [...new Set(result.caveats)];

  if (result.confidence === "insufficient") {
    return {
      title: "Simulated planning brief",
      abstained: true,
      summary: "Insufficient comparable evidence for the declared pathways. No comparison is drawn. Human review is requested.",
      claims: [],
      uncertainty,
      boundary: BOUNDARY,
    };
  }

  const claims: BriefClaim[] = [];
  for (const item of [a, b]) {
    if (item.traffic.data) {
      claims.push({
        text: `${item.scenario.name}: declared corridor journey time ${item.traffic.data.journeyMinutes} min on ${item.traffic.data.corridor}.`,
        citation: cite(item.traffic),
      });
    }
  }
  for (const item of [a, b]) {
    claims.push(
      item.crowding.data
        ? {
            text: `${item.scenario.name}: ${item.crowding.data.patientsWaitingForBeds} patients waiting for beds at ${item.crowding.data.hospital} (published bed-wait context, not ED wait time or capacity).`,
            citation: cite(item.crowding),
          }
        : { text: `${item.scenario.name}: published bed-wait context is unavailable. Nothing is estimated.`, citation: cite(item.crowding) },
    );
  }

  const roadSentence = result.trafficLead
    ? `On road context alone, ${result.trafficLead === "a" ? a.scenario.name : b.scenario.name} shows the shorter declared-corridor journey time by ${result.trafficDeltaMinutes} min.`
    : "The declared corridors show no difference in journey time.";
  const crowdingSentence = typeof result.crowdingDifference === "number"
    ? `Published bed-wait counts differ by ${Math.abs(result.crowdingDifference)} patients; this is a separate crowding signal and is not combined with road time.`
    : "Bed-wait context cannot be compared because it is unavailable for one or both pathways.";

  if (result.confidence === "limited") {
    uncertainty.push("Confidence is limited: at least one input is saved, stale or unavailable.");
  }

  return {
    title: "Simulated planning brief",
    abstained: false,
    summary: `${roadSentence} ${crowdingSentence} Evidence confidence: ${result.confidence}.`,
    claims,
    uncertainty,
    boundary: BOUNDARY,
  };
}
