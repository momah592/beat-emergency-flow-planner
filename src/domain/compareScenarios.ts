import type {
  ComparisonResult,
  EvidenceEnvelope,
  HistoricDemandContext,
  HistoricDemandLayer,
  ScenarioEvidence,
  TransitComparisonLayer,
} from "./types"

const FRESH_TRAFFIC_SECONDS = 300

type CompareOptions = {
  /**
   * Optional shared DFB historic context from P1 (`loadScenarioEvidence` / fixtures).
   * When omitted, the historic-demand layer is explicitly unavailable.
   */
  historicDemand?: EvidenceEnvelope<HistoricDemandContext>
}

const collectCaveats = (
  envelopes: EvidenceEnvelope<unknown>[],
  historicDemand: HistoricDemandLayer,
): string[] => {
  const lines = envelopes
    .filter((item) => item.status !== "live")
    .map((item) => `${item.source}: ${item.caveat}`)

  if (historicDemand.status !== "live") {
    const sourceLabel = historicDemand.source ?? "Historic demand"
    lines.push(`${sourceLabel}: ${historicDemand.caveat}`)
  }

  return [...new Set(lines)]
}

const toHistoricDemandLayer = (
  historicDemand?: EvidenceEnvelope<HistoricDemandContext>,
): HistoricDemandLayer => {
  if (!historicDemand) {
    return {
      status: "unavailable",
      caveat: "Historical DFB context was not supplied to the comparison. It is not live incident demand.",
    }
  }

  return {
    status: historicDemand.status,
    source: historicDemand.source,
    sourceUrl: historicDemand.sourceUrl,
    retrievedAt: historicDemand.retrievedAt,
    observedAt: historicDemand.observedAt,
    area: historicDemand.data?.area,
    note: historicDemand.data?.note,
    caveat: historicDemand.caveat,
  }
}

const toTransitLayer = (a: ScenarioEvidence, b: ScenarioEvidence): TransitComparisonLayer => {
  const aTransit = a.transit
  const bTransit = b.transit
  const aHasContext = aTransit.status !== "unavailable" && Boolean(aTransit.data?.message)
  const bHasContext = bTransit.status !== "unavailable" && Boolean(bTransit.data?.message)

  if (!aHasContext && !bHasContext) {
    const bothUnavailable = aTransit.status === "unavailable" && bTransit.status === "unavailable"
    return {
      a: aTransit,
      b: bTransit,
      disruptionContextOn: bothUnavailable ? "unavailable" : "neither",
    }
  }

  if (aHasContext && bHasContext) {
    return { a: aTransit, b: bTransit, disruptionContextOn: "both" }
  }

  return {
    a: aTransit,
    b: bTransit,
    disruptionContextOn: aHasContext ? "a" : "b",
  }
}

const resolveConfidence = (a: ScenarioEvidence, b: ScenarioEvidence): ComparisonResult["confidence"] => {
  const trafficComparable = a.traffic.data !== undefined && b.traffic.data !== undefined
  if (!trafficComparable) {
    return "insufficient"
  }

  const crowdingComparable = a.crowding.data !== undefined && b.crowding.data !== undefined
  const trafficLiveAndFresh = [a.traffic, b.traffic].every(
    (item) => item.status === "live" && (item.freshnessSeconds ?? Infinity) < FRESH_TRAFFIC_SECONDS,
  )
  const crowdingPresent = crowdingComparable
    && a.crowding.status !== "unavailable"
    && b.crowding.status !== "unavailable"

  if (trafficLiveAndFresh && crowdingPresent) {
    return "high"
  }

  return "limited"
}

/**
 * Deterministic Scenario A/B comparison.
 * Expects P1 `ScenarioEvidence` envelopes. Optional historic demand is a shared layer, not a destination rank.
 */
export const compareScenarios = (
  a: ScenarioEvidence,
  b: ScenarioEvidence,
  options: CompareOptions = {},
): ComparisonResult => {
  const aTraffic = a.traffic.data
  const bTraffic = b.traffic.data
  const aCrowding = a.crowding.data
  const bCrowding = b.crowding.data

  const trafficComparable = aTraffic !== undefined && bTraffic !== undefined
  const crowdingComparable = aCrowding !== undefined && bCrowding !== undefined

  // Observed speed on each pathway's TRIPS-covered links. The higher speed is the lighter corridor.
  const trafficDeltaKmh = trafficComparable
    ? Math.round(Math.abs(aTraffic.speedKmh - bTraffic.speedKmh) * 10) / 10
    : undefined

  const trafficLead = !trafficComparable || aTraffic.speedKmh === bTraffic.speedKmh
    ? undefined
    : aTraffic.speedKmh > bTraffic.speedKmh
      ? "a"
      : "b"

  const crowdingDifference = crowdingComparable
    ? aCrowding.patientsWaitingForBeds - bCrowding.patientsWaitingForBeds
    : undefined

  const transit = toTransitLayer(a, b)
  const historicDemand = toHistoricDemandLayer(options.historicDemand)
  const confidence = resolveConfidence(a, b)
  const caveats = collectCaveats(
    [a.traffic, b.traffic, a.crowding, b.crowding, a.transit, b.transit],
    historicDemand,
  )

  return {
    scenarios: [a, b],
    trafficLead,
    trafficDeltaKmh,
    crowdingDifference,
    transit,
    historicDemand,
    confidence,
    caveats,
  }
}
