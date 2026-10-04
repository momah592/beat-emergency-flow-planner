import { describe, expect, it } from "vitest"
import { dfbContext, scenarios } from "../data/fixtures"
import { sources } from "../data/sourceRegistry"
import { compareScenarios } from "./compareScenarios"
import type { EvidenceEnvelope, HistoricDemandContext, ScenarioEvidence } from "./types"

const retrievedAt = "2026-10-04T10:30:00Z"
const fixtureTrafficDeltaMinutes = 15.9
const fixtureCrowdingDifference = 27

const withTraffic = (
  base: ScenarioEvidence,
  traffic: ScenarioEvidence["traffic"],
): ScenarioEvidence => ({
  ...base,
  traffic,
})

const withCrowding = (
  base: ScenarioEvidence,
  crowding: ScenarioEvidence["crowding"],
): ScenarioEvidence => ({
  ...base,
  crowding,
})

const withTransit = (
  base: ScenarioEvidence,
  transit: ScenarioEvidence["transit"],
): ScenarioEvidence => ({
  ...base,
  transit,
})

const liveFreshTraffic = (
  base: ScenarioEvidence["traffic"],
  journeyMinutes: number,
): ScenarioEvidence["traffic"] => ({
  ...base,
  status: "live",
  retrievedAt,
  observedAt: "2026-10-04T10:29:30Z",
  freshnessSeconds: 30,
  caveat: "Live DCC TRIPS corridor sample.",
  data: {
    corridor: base.data?.corridor ?? base.source,
    direction: base.data?.direction ?? "Unknown",
    journeyMinutes,
  },
})

const unavailableTraffic = (base: ScenarioEvidence["traffic"]): ScenarioEvidence["traffic"] => ({
  ...base,
  status: "unavailable",
  freshnessSeconds: undefined,
  observedAt: undefined,
  caveat: "No valid corridor mapping for this declared pathway.",
  data: undefined,
})

const historicDemandEnvelope: EvidenceEnvelope<HistoricDemandContext> = {
  source: sources.dfb.name,
  sourceUrl: sources.dfb.url,
  status: "replayed",
  retrievedAt,
  caveat: "Historical aggregate only; not live incident demand.",
  data: dfbContext,
}

describe("compareScenarios", () => {
  it("compares declared scenarios without producing a destination recommendation", () => {
    const result = compareScenarios(scenarios.a, scenarios.b, {
      historicDemand: historicDemandEnvelope,
    })

    expect(result.trafficLead).toBe("a")
    expect(result.trafficDeltaMinutes).toBe(fixtureTrafficDeltaMinutes)
    expect(result.crowdingDifference).toBe(fixtureCrowdingDifference)
    expect(JSON.stringify(result)).not.toMatch(/recommend|dispatch|triage|send the/i)
  })

  it("folds transit into its own layer instead of caveat-only handling", () => {
    const a = withTransit(scenarios.a, {
      ...scenarios.a.transit,
      status: "replayed",
      caveat: "Saved GTFS alert context for the corridor.",
      data: { area: "Dublin 2", message: "Service alert on northbound approaches" },
    })
    const b = withTransit(scenarios.b, {
      ...scenarios.b.transit,
      status: "unavailable",
      caveat: "GTFS Realtime API key not configured.",
      data: undefined,
    })

    const result = compareScenarios(a, b)

    expect(result.transit.disruptionContextOn).toBe("a")
    expect(result.transit.a.data?.message).toContain("Service alert")
    expect(result.transit.b.status).toBe("unavailable")
  })

  it("marks transit disruption as unavailable when both sides lack transit context", () => {
    const result = compareScenarios(scenarios.a, scenarios.b)
    expect(result.transit.disruptionContextOn).toBe("unavailable")
  })

  it("folds DFB historic demand into its own layer", () => {
    const result = compareScenarios(scenarios.a, scenarios.b, {
      historicDemand: historicDemandEnvelope,
    })

    expect(result.historicDemand.status).toBe("replayed")
    expect(result.historicDemand.area).toBe(dfbContext.area)
    expect(result.historicDemand.note).toBe(dfbContext.note)
    expect(result.historicDemand.source).toBe(sources.dfb.name)
  })

  it("uses an explicit unavailable historic-demand layer when P1 omits DFB", () => {
    const result = compareScenarios(scenarios.a, scenarios.b)
    expect(result.historicDemand.status).toBe("unavailable")
    expect(result.historicDemand.area).toBeUndefined()
  })

  it("deduplicates identical caveats from the same source", () => {
    const result = compareScenarios(scenarios.a, scenarios.b)
    const gtfsCaveats = result.caveats.filter((line) => line.startsWith(`${sources.gtfs.name}:`))
    expect(gtfsCaveats).toHaveLength(1)
    expect(result.caveats.length).toBe(new Set(result.caveats).size)
  })

  it("resolves confidence high when live fresh traffic and crowding are both comparable", () => {
    const a = withCrowding(
      withTraffic(scenarios.a, liveFreshTraffic(scenarios.a.traffic, 12)),
      { ...scenarios.a.crowding, status: "replayed" },
    )
    const b = withCrowding(
      withTraffic(scenarios.b, liveFreshTraffic(scenarios.b.traffic, 18)),
      { ...scenarios.b.crowding, status: "replayed" },
    )

    const result = compareScenarios(a, b)
    expect(result.confidence).toBe("high")
    expect(result.trafficLead).toBe("a")
    expect(result.trafficDeltaMinutes).toBe(6)
  })

  it("resolves confidence limited when corridor times exist but evidence is not live-fresh", () => {
    const result = compareScenarios(scenarios.a, scenarios.b)
    expect(result.confidence).toBe("limited")
    expect(result.trafficDeltaMinutes).toBe(fixtureTrafficDeltaMinutes)
  })

  it("resolves confidence insufficient when corridor journey times are not comparable", () => {
    const a = withTraffic(scenarios.a, unavailableTraffic(scenarios.a.traffic))
    const b = withTraffic(scenarios.b, unavailableTraffic(scenarios.b.traffic))

    const result = compareScenarios(a, b)
    expect(result.confidence).toBe("insufficient")
    expect(result.trafficLead).toBeUndefined()
    expect(result.trafficDeltaMinutes).toBeUndefined()
  })

  it("keeps crowding as a signed difference rather than a destination rank", () => {
    const result = compareScenarios(scenarios.a, scenarios.b)
    expect(result.crowdingDifference).toBe(fixtureCrowdingDifference)
    expect(result).not.toHaveProperty("recommendedScenario")
    expect(result).not.toHaveProperty("destination")
  })
})
