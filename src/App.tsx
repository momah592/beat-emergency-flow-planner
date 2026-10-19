import { useState } from "react";
import { createPlanningBrief } from "./brief/createPlanningBrief";
import { BriefPanel } from "./components/BriefPanel";
import { EvidenceCard } from "./components/EvidenceCard";
import { FleetMap } from "./components/FleetMap";
import { PathwayCard } from "./components/PathwayCard";
import { sources } from "./data/sourceRegistry";
import type { ComparisonResult, EvidenceEnvelope, HistoricDemandContext } from "./domain/types";
import { DEFAULT_INCIDENT_ID, INCIDENTS } from "./fleet/fixtures";
import type { Incident } from "./fleet/types";
import { useComparison } from "./state/useComparison";

const BANNER =
  "Simulated planning comparison only. Not for ambulance dispatch, hospital selection, triage or clinical decision-making. Final decisions rest with dispatch and clinical teams.";

const DEMO_QUESTION = "Which of the two pathways has lower planning friction right now, and what evidence drove that?";

export default function App() {
  return <LiveBeatApp />;
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path d="M5 17h5l3-8 5 15 3-9 2 2h4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LiveBeatApp = () => {
  const [incidentId, setIncidentId] = useState(DEFAULT_INCIDENT_ID);
  const state = useComparison(incidentId);
  const active = INCIDENTS.find((i) => i.id === incidentId) ?? INCIDENTS[0];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><Logo /><span>Beat</span><em>Dublin emergency-flow planning</em></div>
          <span className="sim-chip">Planning simulation</span>
        </div>
        <p className="banner" role="note">{BANNER}</p>
      </header>

      <main>
        <section className="intro">
          <div className="intro-copy">
            <p className="eyebrow">Simulated incident · fixed demonstration scene</p>
            <h1>High-acuity incident, {active.label}</h1>
            <p className="question">{DEMO_QUESTION}</p>
            <details className="howto">
              <summary>How to read this page</summary>
              <ol>
                <li>Pick a simulated incident. The map shows the two pathways being compared.</li>
                <li>Each pathway card shows <strong>road time</strong> and <strong>hospital crowding</strong> separately. They are never added together.</li>
                <li>Every figure says where it came from and how old it is. “Unavailable” means we have no data. Nothing is estimated.</li>
                <li>This is a planning simulation. People decide, not this page.</li>
              </ol>
            </details>
          </div>
          <div className="intro-side">
            <div className="segmented" role="group" aria-label="Simulated incident location">
              {INCIDENTS.map((incident) => (
                <button
                  key={incident.id}
                  type="button"
                  className={incident.id === incidentId ? "seg is-active" : "seg"}
                  aria-pressed={incident.id === incidentId}
                  onClick={() => setIncidentId(incident.id)}
                >
                  {incident.label}<em>{incident.area}</em>
                </button>
              ))}
            </div>
            {state.phase === "ready" && <span className={`confidence ${state.result.confidence}`}>Evidence confidence: {state.result.confidence}</span>}
          </div>
        </section>

        <div className="workspace">
          <section className="card map-card" aria-label="Map">
            {state.phase === "ready" ? (
              <FleetMap incident={state.incident} result={state.result} />
            ) : (
              <div className="map map-placeholder">{state.phase === "error" ? "Evidence unavailable" : "Retrieving public-data evidence…"}</div>
            )}
            <div className="map-legend">
              <span><i className="legend-line legend-a" /> Scenario A pathway</span>
              <span><i className="legend-line legend-b" /> Scenario B pathway</span>
              <span><i className="legend-scene" /> Simulated scene</span>
              <span><i className="legend-dot" /> Simulated unit</span>
            </div>
          </section>

          <div className="pathways">
            {state.phase === "loading" && <><div className="pathway skeleton" /><div className="pathway skeleton" /></>}
            {state.phase === "error" && (
              <div className="card notice">
                <h2>Evidence unavailable</h2>
                <p>{state.message}</p>
                <p className="small">Insufficient evidence. Human review requested. Nothing is estimated in its place.</p>
              </div>
            )}
            {state.phase === "ready" && <Pathways incident={state.incident} result={state.result} />}
          </div>
        </div>

        {state.phase === "ready" && <Detail result={state.result} />}

        <footer className="footer">
          <div className="source-links">
            <span className="eyebrow">Data sources</span>
            {Object.values(sources).map((source) => (
              <a key={source.name} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
            ))}
          </div>
          <p className="small">{BANNER}</p>
        </footer>
      </main>
    </>
  );
};

function Pathways({ incident, result }: { incident: Incident; result: ComparisonResult }) {
  const [a, b] = result.scenarios;
  return (
    <>
      <PathwayCard evidence={a} accent="a" />
      <PathwayCard evidence={b} accent="b" />
      <div className="diff" aria-label={`Differences for the simulated incident at ${incident.label}`}>
        <div className="diff-tile">
          <span>Road time difference</span>
          <strong>{result.trafficDeltaMinutes !== undefined ? `${result.trafficDeltaMinutes} min` : "n/a"}</strong>
        </div>
        <div className="diff-tile">
          <span>Bed-wait difference</span>
          <strong>{result.crowdingDifference !== undefined ? `${Math.abs(result.crowdingDifference)} patients` : "n/a"}</strong>
        </div>
        <p className="diff-note">Differences only, no pick. Bed-wait context is a published daily count of patients waiting for beds, not an ED wait time or hospital capacity.</p>
      </div>
      <StatusStrip result={result} />
    </>
  );
}

const openEvidence = () => {
  const el = document.getElementById("evidence") as HTMLDetailsElement | null;
  if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); }
};

function StatusStrip({ result }: { result: ComparisonResult }) {
  const [a, b] = result.scenarios;
  const chips: { label: string; status: string }[] = [
    { label: "Road A", status: a.traffic.status },
    { label: "Road B", status: b.traffic.status },
    { label: "Crowding A", status: a.crowding.status },
    { label: "Crowding B", status: b.crowding.status },
    { label: "Transit", status: a.transit.status },
    { label: "History", status: result.historicDemand.status },
  ];
  return (
    <div className="strip">
      <div className="strip-head">
        <span className="eyebrow">Data status</span>
        <button type="button" className="link-btn" onClick={openEvidence}>See sources</button>
      </div>
      <ul>
        {chips.map((chip) => (
          <li key={chip.label} className={`chip ${chip.status}`}>
            <i />{chip.label}<em>{chip.status === "replayed" ? "saved" : chip.status}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ result }: { result: ComparisonResult }) {
  const [a, b] = result.scenarios;
  const brief = createPlanningBrief(result);
  const demand = result.historicDemand;
  const demandEnvelope: EvidenceEnvelope<HistoricDemandContext> | undefined =
    demand.source && demand.sourceUrl && demand.retrievedAt
      ? {
          source: demand.source,
          sourceUrl: demand.sourceUrl,
          status: demand.status,
          retrievedAt: demand.retrievedAt,
          observedAt: demand.observedAt,
          caveat: demand.caveat,
        }
      : undefined;

  return (
    <>
      <details className="block fold" id="evidence">
        <summary>
          <span className="fold-title">Evidence trail</span>
          <span className="fold-sub">Source, status and timestamps for every signal</span>
        </summary>
        <div className="evidence-grid">
          <EvidenceCard title="Road: Scenario A" role="Core road-corridor journey time" evidence={a.traffic} />
          <EvidenceCard title="Road: Scenario B" role="Core road-corridor journey time" evidence={b.traffic} />
          <EvidenceCard title="Crowding: Scenario A" role="Published bed-wait context, not ED wait time" evidence={a.crowding} />
          <EvidenceCard title="Crowding: Scenario B" role="Published bed-wait context, not ED wait time" evidence={b.crowding} />
          <EvidenceCard title="Transit" role="Corroborating context only; never used to infer road speed" evidence={a.transit} />
          {demandEnvelope && (
            <EvidenceCard
              title="Historical demand"
              role="Retrospective context only; not live demand"
              evidence={{ ...demandEnvelope, caveat: `${demand.area ?? ""}. ${demand.note ?? ""} ${demand.caveat}`.trim() }}
            />
          )}
        </div>
      </details>

      <BriefPanel brief={brief} />
    </>
  );
}
