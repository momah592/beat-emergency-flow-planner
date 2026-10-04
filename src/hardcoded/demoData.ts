export type HardcodedStatus = "live" | "replayed" | "unavailable"

export type HardcodedEvidence = {
  id: string
  title: string
  source: string
  sourceUrl: string
  status: HardcodedStatus
  role: string
  retrievedAt: string
  observedAt: string | null
  freshnessLabel: string
  value: string
  caveat: string
}

export type HardcodedScenario = {
  id: "a" | "b"
  label: string
  pathwayType: string
  hospital: string
  corridor: string
  journeyMinutes: number
  patientsWaitingForBeds: number
  crowdingPublishedDate: string
  notes: string[]
}

export const hardcodedDemo = {
  product: "Beat",
  subtitle: "Dublin Emergency Flow Simulator",
  incident: {
    title: "Simulated high-acuity incident in Tallaght",
    location: "Tallaght, Dublin 24",
    timestamp: "2026-10-04T14:32:00Z",
    timestampLabel: "4 Oct 2026, 15:32 local",
    acuity: "High-acuity (simulated)",
    framing:
      "Planning simulation only. Final routing stays with dispatch / clinical teams.",
  },
  processSteps: [
    {
      id: 1,
      title: "Lock simulated incident",
      detail: "Fixed Tallaght scene. No patient identifiers.",
    },
    {
      id: 2,
      title: "Pull public evidence",
      detail: "TRIPS corridors, GTFS context, INMO crowding, DFB history.",
    },
    {
      id: 3,
      title: "Compare declared pathways",
      detail: "Nearest-hospital vs flow-aware. Differences only.",
    },
    {
      id: 4,
      title: "Draft auditable brief",
      detail: "Cite sources, surface uncertainty, require human approval.",
    },
  ],
  evidence: [
    {
      id: "trips",
      title: "Road corridor travel",
      source: "DCC TRIPS",
      sourceUrl:
        "https://data.smartdublin.ie/en/dataset/journey-times-across-dublin-city-from-dublin-city-council-traffic-departments-trips-system",
      status: "live",
      role: "Primary congestion / journey-time signal",
      retrievedAt: "2026-10-04T14:32:00Z",
      observedAt: "2026-10-04T14:31:00Z",
      freshnessLabel: "Updated ~1 min ago",
      value: "Nearest corridor 11 min · Flow-aware corridor 17 min",
      caveat: "Hardcoded demo values shaped like a live TRIPS corridor sample.",
    },
    {
      id: "gtfs",
      title: "Transit disruption context",
      source: "NTA GTFS-Realtime",
      sourceUrl: "https://data.gov.ie/dataset/nta-gtfs",
      status: "replayed",
      role: "Corroborating bus delay / alert signal only",
      retrievedAt: "2026-10-04T14:32:00Z",
      observedAt: "2026-10-04T14:10:00Z",
      freshnessLabel: "Saved snapshot",
      value: "Service pressure noted on approaches toward city-centre corridors",
      caveat: "Not used as a road-speed estimate. API key path not required for this hardcoded demo.",
    },
    {
      id: "inmo",
      title: "Hospital crowding context",
      source: "INMO Trolley Watch",
      sourceUrl: "https://www.inmo.ie/News-Campaigns/Trolley-Watch",
      status: "replayed",
      role: "Daily patients-waiting-for-beds / crowding signal",
      retrievedAt: "2026-10-04T14:32:00Z",
      observedAt: "2026-10-04T08:00:00Z",
      freshnessLabel: "Published morning figure",
      value: "Nearest pathway 41 · Flow-aware pathway 19",
      caveat: "Patients waiting for beds / crowding context. Not ED wait time, capacity, or suitability.",
    },
    {
      id: "dfb",
      title: "Historic demand context",
      source: "Dublin Fire Brigade incidents",
      sourceUrl: "https://data.gov.ie/dataset/fire-brigade-and-ambulance",
      status: "replayed",
      role: "Retrospective area / priority pattern",
      retrievedAt: "2026-10-04T14:32:00Z",
      observedAt: null,
      freshnessLabel: "Historic aggregate",
      value: "Tallaght area shows recurring afternoon priority load in saved aggregate",
      caveat: "Historical only. Not live incident demand.",
    },
  ] satisfies HardcodedEvidence[],
  scenarios: [
    {
      id: "a",
      label: "Scenario A",
      pathwayType: "Nearest-hospital pathway",
      hospital: "Declared Tallaght pathway",
      corridor: "Tallaght local corridor (declared nearest)",
      journeyMinutes: 11,
      patientsWaitingForBeds: 41,
      crowdingPublishedDate: "2026-10-04",
      notes: [
        "Shorter observed corridor journey time.",
        "Higher published bed-wait / crowding context.",
      ],
    },
    {
      id: "b",
      label: "Scenario B",
      pathwayType: "Flow-aware pathway",
      hospital: "Declared alternate city pathway",
      corridor: "Tallaght to alternate corridor (declared flow-aware)",
      journeyMinutes: 17,
      patientsWaitingForBeds: 19,
      crowdingPublishedDate: "2026-10-04",
      notes: [
        "Longer observed corridor journey time (+6 min).",
        "Lower published bed-wait / crowding context.",
      ],
    },
  ] satisfies HardcodedScenario[],
  comparison: {
    confidence: "limited" as const,
    confidenceWhy:
      "Corridor times are comparable, but crowding and transit are replayed snapshots rather than fully live enrichment.",
    trafficDeltaMinutes: 6,
    shorterRoadOn: "a" as const,
    crowdingDifference: 22,
    lowerCrowdingOn: "b" as const,
    keyMetric:
      "How much avoidable delay could system planners identify under different traffic-and-capacity scenarios?",
    tradeoff:
      "Nearest pathway is 6 minutes faster on the declared corridor, but carries a substantially higher published patients-waiting-for-beds context (41 vs 19). Beat surfaces that traffic-and-capacity tension for planner review.",
  },
  brief: {
    title: "Auditable planning brief",
    approvalLine: "This is a planning simulation; dispatcher approval required.",
    paragraphs: [
      "Simulated high-acuity incident in Tallaght at 15:32 local. Two pre-declared pathways were compared: nearest-hospital and flow-aware.",
      "DCC TRIPS-shaped corridor evidence: Scenario A 11 minutes, Scenario B 17 minutes (delta 6 minutes). Observed/retrieval times are shown on the evidence cards.",
      "INMO Trolley Watch-shaped crowding context: Scenario A 41 patients waiting for beds, Scenario B 19, published 4 Oct 2026. This is crowding / bed-wait context, not ED wait time or destination capacity.",
      "NTA GTFS-Realtime and DFB layers are supporting context only. GTFS is not converted into a road-speed estimate. DFB is historic, not live demand.",
    ],
    uncertainty: [
      "Confidence is limited because crowding and transit inputs are replayed demo snapshots.",
      "No live hospital capacity feed is used.",
      "This hardcoded package is for process demonstration if live adapters are incomplete.",
    ],
    questionsForReview: [
      "Is the 6-minute corridor saving on the nearest pathway operationally meaningful under current conditions?",
      "Does the higher published bed-wait context on the nearest pathway change planning friction for this simulated case?",
      "Which evidence timestamps should a dispatcher treat as stale before any human decision?",
    ],
  },
} as const
