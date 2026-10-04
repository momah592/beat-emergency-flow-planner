import type { ComparisonResult, EvidenceEnvelope } from "../domain/types";
import type { BriefClaim, ClaimBasis, PlanningBrief, Recommendation } from "./types";

export const DISCLAIMER =
  "Prototype built on public data for Build for Ireland. Confirm against live operational systems before any real-world use.";

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

function buildRecommendation(result: ComparisonResult): Recommendation {
  const [a, b] = result.scenarios;
  const basis = basisOf(a.traffic, b.traffic, a.crowding, b.crowding);
  const bothTraffic = a.traffic.data !== undefined && b.traffic.data !== undefined;

  if (!bothTraffic) {
    return {
      pathwayId: undefined,
      headline: "No route suggested",
      rationale:
        "Observed journey time is missing for at least one corridor, so the two routes cannot be compared. No suggestion is made rather than a guessed one.",
      basis,
    };
  }

  if (result.trafficLead === undefined) {
    return {
      pathwayId: undefined,
      headline: "Both routes equal on observed journey time",
      rationale:
        "The two corridors show the same observed journey time, so travel time does not separate them. Choose on operational grounds.",
      basis,
    };
  }

  const lead = result.trafficLead === "a" ? a : b;
  const other = result.trafficLead === "a" ? b : a;
  const minutes = result.trafficDeltaMinutes ?? 0;
  const leadCrowding = lead.crowding.data;
  const otherCrowding = other.crowding.data;

  const crowdingNote =
    leadCrowding && otherCrowding
      ? leadCrowding.patientsWaitingForBeds > otherCrowding.patientsWaitingForBeds
        ? ` Note that ${lead.scenario.name} also has the higher published trolley count (${leadCrowding.patientsWaitingForBeds} against ${otherCrowding.patientsWaitingForBeds}), so the two signals point in opposite directions.`
        : ` ${lead.scenario.name} also has the lower published trolley count (${leadCrowding.patientsWaitingForBeds} against ${otherCrowding.patientsWaitingForBeds}), so both signals agree.`
      : " No published trolley count is available to weigh alongside journey time.";

  return {
    pathwayId: result.trafficLead,
    headline: `${lead.scenario.name} — ${minutes} minute${minutes === 1 ? "" : "s"} shorter on observed journey time`,
    rationale: `${lead.scenario.declaredCorridor} shows the shorter observed corridor journey time, by ${minutes} minute${minutes === 1 ? "" : "s"}.${crowdingNote}`,
    basis,
  };
}

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
    statement:
      aCrowding && bCrowding
        ? `${a.scenario.name} is associated with ${aCrowding.patientsWaitingForBeds} patients waiting for beds as published on ${aCrowding.publishedDate}; ${b.scenario.name} with ${bCrowding.patientsWaitingForBeds}.`
        : "Published trolley count is unavailable for one or both hospitals.",
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
    title: "Route comparison",
    confidence: result.confidence,
    recommendation: buildRecommendation(result),
    claims,
    limitations,
    disclaimer: DISCLAIMER,
  };
}
