export type EvidenceStatus = "live" | "replayed" | "unavailable";

export type EvidenceEnvelope<T> = {
  source: string;
  sourceUrl: string;
  status: EvidenceStatus;
  retrievedAt: string;
  observedAt?: string;
  freshnessSeconds?: number;
  caveat: string;
  data?: T;
};

export type TrafficContext = {
  corridor: string;
  direction: string;
  journeyMinutes: number;
};

export type TransitContext = {
  area: string;
  message: string;
};

export type CrowdingContext = {
  hospital: string;
  patientsWaitingForBeds: number;
  publishedDate: string;
};

export type HistoricDemandContext = {
  area: string;
  note: string;
};

export type Scenario = {
  id: "a" | "b";
  name: string;
  declaredCorridor: string;
  namedHospital: string;
};

export type ScenarioEvidence = {
  scenario: Scenario;
  traffic: EvidenceEnvelope<TrafficContext>;
  crowding: EvidenceEnvelope<CrowdingContext>;
  transit: EvidenceEnvelope<TransitContext>;
};

/** Where transit disruption context is present. Difference marker only — not a routing rank. */
export type DisruptionContextOn = "a" | "b" | "both" | "neither" | "unavailable";

export type TransitComparisonLayer = {
  a: EvidenceEnvelope<TransitContext>;
  b: EvidenceEnvelope<TransitContext>;
  disruptionContextOn: DisruptionContextOn;
};

/** Shared historic DFB area context folded into the comparison, not a destination score. */
export type HistoricDemandLayer = {
  status: EvidenceStatus;
  source?: string;
  sourceUrl?: string;
  retrievedAt?: string;
  observedAt?: string;
  area?: string;
  note?: string;
  caveat: string;
};

export type ComparisonResult = {
  scenarios: [ScenarioEvidence, ScenarioEvidence];
  /** Scenario id with the shorter observed corridor journey; undefined if equal or incomparable. Not a destination pick. */
  trafficLead?: "a" | "b";
  trafficDeltaMinutes?: number;
  /** Scenario A bed-wait count minus Scenario B; undefined if either side missing. Not capacity. */
  crowdingDifference?: number;
  transit: TransitComparisonLayer;
  historicDemand: HistoricDemandLayer;
  confidence: "high" | "limited" | "insufficient";
  caveats: string[];
};

