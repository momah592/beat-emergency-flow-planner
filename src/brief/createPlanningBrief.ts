import type { ComparisonResult, EvidenceEnvelope } from "../domain/types";
import type { BriefClaim, BriefSummary, ClaimBasis, PlanningBrief } from "./types";

export const DISCLAIMER =
  "This is a planning simulation; dispatcher approval required. This is a simulated planning comparison for review only. It is not a dispatch, destination, triage or clinical recommendation. Final decisions rest with dispatch and clinical teams.";

/** What the sources do and do not measure. These hold however fresh the feed is. */
const STANDING_LIMITATIONS = [
  "Road figures are general traffic observations on the TRIPS-covered links of each route. They are not blue-light response estimates, and an emergency vehicle will not experience the corridor the same way.",
  "TRIPS covers only part of the road network, so each speed is measured on a different share of its route and reflects road type as well as congestion. It is not a full journey time.",
  "The trolley figure is a published daily count of patients waiting for beds. It is not an emergency department waiting time and not a live capacity reading.",
  "Neither source accounts for patient condition, crew availability or hospital specialty cover.",
];

function basisOf(...envelopes: EvidenceEnvelope<unknown>[]): ClaimBasis[] {
  const seen = new Set<string>();
  const basis: ClaimBasis[] = [];

  for (const envelope of envelopes) {
    const key = `${envelope.source}|${envelope.status}|${envelope.retrievedAt}|${envelope.observedAt ?? ""}`;
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
        "Observed road speed is missing for at least one declared pathway (TRIPS has no reading along it), so the two pathways cannot be compared. No comparison is drawn rather than a guessed one.",
      basis,
    };
  }

  const roadSentence = result.trafficLead === undefined
    ? "The two declared pathways show the same observed speed on their TRIPS-covered links."
    : `${(result.trafficLead === "a" ? a : b).scenario.name} shows the higher observed speed on its TRIPS-covered links, by ${result.trafficDeltaKmh} km/h. This is road context only, measured on ${a.traffic.data!.coveragePercent}% and ${b.traffic.data!.coveragePercent}% of the two routes, so it is not a full journey-time comparison.`;

  const aCrowding = a.crowding.data;
  const bCrowding = b.crowding.data;
  const crowdingSentence = aCrowding && bCrowding
    ? `Published trolley counts differ by ${Math.abs(aCrowding.patientsWaitingForBeds - bCrowding.patientsWaitingForBeds)} patients. This is a separate crowding signal and is not combined with road time.`
    : "Crowding context cannot be compared because a published trolley count is unavailable for one or both pathways.";

  return {
    abstained: false,
    headline: result.trafficLead === undefined
      ? "No difference in observed road speed"
      : `Observed road speed differs by ${result.trafficDeltaKmh} km/h`,
    detail: `${roadSentence} ${crowdingSentence}`,
    basis,
  };
}

export function createPlanningBrief(result: ComparisonResult): PlanningBrief {
  const [a, b] = result.scenarios;
  const claims: BriefClaim[] = [];

  const speedLine = (item: typeof a) => {
    const t = item.traffic.data;
    return t
      ? `${item.scenario.name}: ${t.speedKmh} km/h observed on ${t.coveredKm} km (${t.coveragePercent}% of its ${t.routeKm} km route, ${t.matchedLinks} TRIPS link${t.matchedLinks === 1 ? "" : "s"}).`
      : `${item.scenario.name}: no TRIPS reading along this pathway. Nothing is estimated.`;
  };
  const bothTraffic = a.traffic.data !== undefined && b.traffic.data !== undefined;
  claims.push({
    id: "corridor-speed",
    label: "Observed corridor speed",
    statement: [
      speedLine(a),
      speedLine(b),
      bothTraffic && result.trafficLead !== undefined
        ? `${(result.trafficLead === "a" ? a : b).scenario.name} shows the higher speed, by ${result.trafficDeltaKmh} km/h.`
        : "",
    ].filter(Boolean).join(" "),
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
