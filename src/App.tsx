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
import { HardcodedDemo } from "./hardcoded/HardcodedDemo";
import { useComparison } from "./state/useComparison";

const BANNER =
  "Simulated planning comparison only. Not for ambulance dispatch, hospital selection, triage or clinical decision-making. Final decisions rest with dispatch and clinical teams.";

const DEMO_QUESTION = "Which of two pre-declared pathways shows lower planning friction right now, and what evidence drove that?";

const shouldShowHardcodedDemo = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "hardcoded";

export default function App() {
  if (shouldShowHardcodedDemo()) return <HardcodedDemo />;
  return <LiveBeatApp />;
}

const LiveBeatApp = () => {
  const [incidentId, setIncidentId] = useState(DEFAULT_INCIDENT_ID);
  const state = useComparison(incidentId);

  return (
    <>
      <div className="banner" role="note">{BANNER}</div>
      <main>
        <header className="hero">
          <p className="eyebrow">Build for Ireland</p>
          <h1>Beat</h1>
          <p className="lede">A simulated emergency-flow planning comparison for Dublin.</p>
        </header>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Simulated incident · fixed demonstration scene</p>
              <h2>Simulated high-acuity incident, {INCIDENTS.find((i) => i.id === incidentId)?.label}</h2>
            </div>
            {state.phase === "ready" && <span className={`confidence ${state.result.confidence}`}>Evidence confidence: {state.result.confidence}</span>}
          </div>
          <div className="incident-picker" role="group" aria-label="Simulated incident location">
            {INCIDENTS.map((incident) => (
              <button
                key={incident.id}
                type="button"
                className={incident.id === incidentId ? "incident-button is-active" : "incident-button"}
                onClick={() => setIncidentId(incident.id)}
              >
                {incident.label}
                <em>{incident.area}</em>
              </button>
            ))}
          </div>
          <p className="question">{DEMO_QUESTION}</p>

          {state.phase === "ready" ? (
            <FleetMap incident={state.incident} result={state.result} />
          ) : (
            <div className="map map-placeholder">{state.phase === "error" ? "Evidence unavailable" : "Retrieving public-data evidence…"}</div>
          )}
          <div className="map-legend">
            <span><i className="legend-line legend-a" /> Scenario A pathway</span>
            <span><i className="legend-line legend-b" /> Scenario B pathway</span>
            <span><i className="legend-scene" /> Simulated scene</span>
            <span><i className="legend-dot" /> Simulated available unit</span>
          </div>
        </section>

        {state.phase === "loading" && <Skeleton />}

        {state.phase === "error" && (
          <section className="section brief abstained">
            <h2>Evidence unavailable</h2>
            <p>{state.message}</p>
            <p className="small">Insufficient evidence. Human review requested. Nothing is estimated in its place.</p>
          </section>
        )}

        {state.phase === "ready" && <Readout incident={state.incident} result={state.result} />}

        <footer className="footer">
          <p className="eyebrow">Data sources</p>
          <p className="source-links">
            {Object.values(sources).map((source) => (
              <a key={source.name} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
            ))}
          </p>
          <p className="small">{BANNER}</p>
        </footer>
      </main>
    </>
  );
};

function Readout({ incident, result }: { incident: Incident; result: ComparisonResult }) {
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
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Simulated incident at {incident.label}, {incident.area}</p>
            <h2>Declared pathways</h2>
          </div>
        </div>
        <div className="scenario-grid">
          <PathwayCard evidence={a} accent="a" />
          <PathwayCard evidence={b} accent="b" />
        </div>
        <p className="diff">
          <strong>Differences only, no pick.</strong>{" "}
          {result.trafficDeltaMinutes !== undefined ? `Road time differs by ${result.trafficDeltaMinutes} min.` : "Road time cannot be compared."}{" "}
          {result.crowdingDifference !== undefined
            ? `Bed-wait context differs by ${Math.abs(result.crowdingDifference)} patients.`
            : "Bed-wait context cannot be compared (a source is unavailable)."}
        </p>
      </section>

      <section className="section">
        <h2>Evidence trail</h2>
        <p className="small">Every signal with its source, status, observed and retrieval time. “Not supplied” is a valid value.</p>
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
      </section>

      <BriefPanel brief={brief} />
    </>
  );
}

function Skeleton() {
  return (
    <section className="section" aria-busy="true" aria-label="Loading evidence">
      <div className="scenario-grid">
        <div className="pathway skeleton" />
        <div className="pathway skeleton" />
      </div>
    </section>
  );
}
