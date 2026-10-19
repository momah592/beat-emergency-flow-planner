import type { ComparisonResult, EvidenceEnvelope } from "../domain/types";
import type { BriefClaim, BriefSummary, ClaimBasis, PlanningBrief } from "./types";

export const DISCLAIMER =
  "This is a simulated planning comparison for review only. It is not a dispatch, destination, triage or clinical recommendation. Final decisions rest with dispatch and clinical teams.";

/** What the sources do and do not measure. These hold however fresh the feed is. */
const STANDING_LIMITATIONS = [
  "Journey times are general traffic observations. They are not blue-light response estimates, and an emergency vehicle will not experience the corridor the same way.",
  "The trolley figure is a published daily count of patients waiting for beds. It is not an emergency department waiting time and not a live capacity reading.",
  "Neither source accounts for patient condition, crew availability or hospital specialty cover.",
];

function basisOf(...envelopes: EvidenceEnvelope<unknown>[]): ClaimBasis[] {
  const seen = new Set<string>();
  const basis: ClaimBasis[] = [];

  for (const envelope of envelopes) {
    const key = `${envelope.source}|${envelope.retrievedAt}|${envelope.observedAt ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    basis.push({
      source: envelope.source,
      sourceUrl: envelope.sourceUrl,
      status: envelope.status,
      retrievedAt: envelope.retrievedAt,
      observedAt: envelope.observedAt,
    });
  }

  return basis;
}

function buildSummary(result: ComparisonResult): BriefSummary {
  const [a, b] = result.scenarios;
  const basis = basisOf(a.traffic, b.traffic, a.crowding, b.crowding);
  const bothTraffic = a.traffic.data !== undefined && b.traffic.data !== undefined;

  if (!bothTraffic) {
    return {
      abstained: true,
      headline: "Insufficient comparable evidence. Human review requested.",
      detail:
        "Observed journey time is missing for at least one declared corridor, so the two pathways cannot be compared. No comparison is drawn rather than a guessed one.",
      basis,
    };
  }

  const roadSentence = result.trafficLead === undefined
    ? "The two declared corridors show the same observed journey time."
    : `${(result.trafficLead === "a" ? a : b).scenario.name} shows the shorter observed corridor journey time, by ${minutesText(result.trafficDeltaMinutes ?? 0)}. This is road context only.`;

  const aCrowding = a.crowding.data;
  const bCrowding = b.crowding.data;
  const crowdingSentence = aCrowding && bCrowding
    ? `Published trolley counts differ by ${Math.abs(aCrowding.patientsWaitingForBeds - bCrowding.patientsWaitingForBeds)} patients. This is a separate crowding signal and is not combined with road time.`
    : "Crowding context cannot be compared because a published trolley count is unavailable for one or both pathways.";

  return {
    abstained: false,
    headline: result.trafficLead === undefined
      ? "No difference in observed journey time"
      : `Road time differs by ${minutesText(result.trafficDeltaMinutes ?? 0)}`,
    detail: `${roadSentence} ${crowdingSentence}`,
    basis,
  };
}

const minutesText = (minutes: number) => `${minutes} minute${minutes === 1 ? "" : "s"}`;

export function createPlanningBrief(result: ComparisonResult): PlanningBrief {
  const [a, b] = result.scenarios;
  const claims: BriefClaim[] = [];

  const leadName = result.trafficLead === "a" ? a.scenario.name : b.scenario.name;
  const bothTraffic = a.traffic.data !== undefined && b.traffic.data !== undefined;
  claims.push({
    id: "corridor-journey",
    label: "Corridor journey time",
    statement: !bothTraffic
      ? "No comparable observed journey time is available for both corridors."
      : result.trafficLead === undefined
        ? "Both corridors show the same observed journey time."
        : `${leadName} has the shorter observed journey time on its corridor, by ${result.trafficDeltaMinutes} minute${result.trafficDeltaMinutes === 1 ? "" : "s"}.`,
    basis: basisOf(a.traffic, b.traffic),
  });

  const aCrowding = a.crowding.data;
  const bCrowding = b.crowding.data;
  claims.push({
    id: "bed-wait-context",
    label: "Published trolley count",
    statement: [
      [a, aCrowding],
      [b, bCrowding],
    ]
      .map(([item, data]) =>
        data
          ? `${(item as typeof a).scenario.name} is associated with ${(data as typeof aCrowding)!.patientsWaitingForBeds} patients waiting for beds as published on ${(data as typeof aCrowding)!.publishedDate}.`
          : `${(item as typeof a).scenario.name} has no published trolley count available. Nothing is estimated.`,
      )
      .join(" "),
    basis: basisOf(a.crowding, b.crowding),
  });

  const transitMessage = a.transit.data?.message ?? b.transit.data?.message;
  if (transitMessage) {
    claims.push({
      id: "transit-context",
      label: "Transit context",
      statement: `Reported transit context for the area: ${transitMessage}`,
      basis: basisOf(a.transit, b.transit),
    });
  }

  const limitations = [...STANDING_LIMITATIONS];
  if (result.confidence !== "high") {
    limitations.push(
      "At least one source is replayed or unavailable rather than live, so this comparison is not current.",
    );
  }

  return {
    title: "Simulated planning brief",
    confidence: result.confidence,
    summary: buildSummary(result),
    claims,
    uncertainty: result.caveats,
    limitations,
    disclaimer: DISCLAIMER,
  };
}
