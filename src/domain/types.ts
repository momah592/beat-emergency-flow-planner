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

export type ComparisonResult = {
  scenarios: [ScenarioEvidence, ScenarioEvidence];
  trafficLead?: "a" | "b";
  trafficDeltaMinutes?: number;
  crowdingDifference?: number;
  confidence: "high" | "limited" | "insufficient";
  caveats: string[];
};

