import type { EvidenceEnvelope, ScenarioEvidence } from "../domain/types";
import { scenarios } from "../data/fixtures";

export type Layer = "traffic" | "crowding" | "transit";

/** Drops a layer's data and marks it unavailable, as a failed feed would. */
function unavailable<T>(envelope: EvidenceEnvelope<T>): EvidenceEnvelope<T> {
  return { ...envelope, status: "unavailable", data: undefined, observedAt: undefined, freshnessSeconds: undefined };
}

/** Marks a layer live and fresh, as a working feed would. */
function live<T>(envelope: EvidenceEnvelope<T>): EvidenceEnvelope<T> {
  return { ...envelope, status: "live", freshnessSeconds: 30 };
}

export function withUnavailable(evidence: ScenarioEvidence, layers: Layer[]): ScenarioEvidence {
  return {
    ...evidence,
    traffic: layers.includes("traffic") ? unavailable(evidence.traffic) : evidence.traffic,
    crowding: layers.includes("crowding") ? unavailable(evidence.crowding) : evidence.crowding,
    transit: layers.includes("transit") ? unavailable(evidence.transit) : evidence.transit,
  };
}

export function withLive(evidence: ScenarioEvidence, layers: Layer[]): ScenarioEvidence {
  return {
    ...evidence,
    traffic: layers.includes("traffic") ? live(evidence.traffic) : evidence.traffic,
    crowding: layers.includes("crowding") ? live(evidence.crowding) : evidence.crowding,
    transit: layers.includes("transit") ? live(evidence.transit) : evidence.transit,
  };
}

/** Forces a declared corridor to a given observed journey time. */
export function withEqualJourney(evidence: ScenarioEvidence, minutes: number): ScenarioEvidence {
  if (!evidence.traffic.data) return evidence;
  return { ...evidence, traffic: { ...evidence.traffic, data: { ...evidence.traffic.data, journeyMinutes: minutes } } };
}

/** The evidence states the brief has to stay safe across. */
export function evidenceVariants(): { name: string; a: ScenarioEvidence; b: ScenarioEvidence }[] {
  const { a, b } = scenarios;
  const allLayers: Layer[] = ["traffic", "crowding", "transit"];
  return [
    { name: "replayed fixtures", a, b },
    { name: "all layers live", a: withLive(a, allLayers), b: withLive(b, allLayers) },
    { name: "traffic unavailable", a: withUnavailable(a, ["traffic"]), b: withUnavailable(b, ["traffic"]) },
    { name: "crowding unavailable", a: withUnavailable(a, ["crowding"]), b: withUnavailable(b, ["crowding"]) },
    { name: "every layer unavailable", a: withUnavailable(a, allLayers), b: withUnavailable(b, allLayers) },
    { name: "one side only", a, b: withUnavailable(b, allLayers) },
    { name: "identical journey times", a: withEqualJourney(a, 16), b: withEqualJourney(b, 16) },
  ];
}
