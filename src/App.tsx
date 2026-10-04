import { useState } from "react";
import { createPlanningBrief } from "./brief/createPlanningBrief";
import { BriefPanel } from "./components/BriefPanel";
import { EvidenceCard } from "./components/EvidenceCard";
import { FleetMap } from "./components/FleetMap";
import { ScenarioColumn } from "./components/ScenarioColumn";
import type { ComparisonResult } from "./domain/types";
import { DEFAULT_INCIDENT_ID, INCIDENTS } from "./fleet/fixtures";
import type { Incident } from "./fleet/types";
import { useComparison } from "./state/useComparison";

const LAYERS = [
  { key: "traffic", title: "Corridor traffic" },
  { key: "crowding", title: "Published trolley count" },
  { key: "transit", title: "Transit context" },
] as const;

export default function App() {
  const [incidentId, setIncidentId] = useState(DEFAULT_INCIDENT_ID);
  const state = useComparison(incidentId);
  const brief = state.phase === "ready" ? createPlanningBrief(state.result) : undefined;

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">Build for Ireland</p>
        <h1>Beat</h1>
        <p className="lede">A unit is on scene. Which hospital, and what does the evidence say?</p>
        <p className="warning">
          Prototype on public data. Journey times are general traffic observations, not blue-light response estimates.
          Confirm against live operational systems before any real-world use.
        </p>
      </header>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dublin city centre</p>
            <h2>Fleet and candidate hospitals</h2>
          </div>
          <div className="incident-picker">
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
        </div>

        {state.phase === "ready" ? (
          <FleetMap incident={state.incident} result={state.result} suggested={brief?.recommendation.pathwayId} />
        ) : (
          <div className="map map-placeholder">
            {state.phase === "error" ? "Evidence unavailable" : "Retrieving public-data evidence…"}
          </div>
        )}

        <div className="map-legend">
          <span><i className="legend-line legend-suggested" /> Suggested run</span>
          <span><i className="legend-line legend-alternate" /> Alternative</span>
          <span><i className="legend-scene" /> Scene</span>
          <span><i className="legend-dot" /> Available unit</span>
        </div>


      </section>

      {state.phase === "error" && (
        <section className="section">
          <h2>Evidence unavailable</h2>
          <p>{state.message}</p>
          <p className="small">No suggestion is shown rather than an estimated one.</p>
        </section>
      )}

      {state.phase === "ready" && brief && <Readout incident={state.incident} result={state.result} brief={brief} />}
    </main>
  );
}

function Readout({
  incident,
  result,
  brief,
}: {
  incident: Incident;
  result: ComparisonResult;
  brief: ReturnType<typeof createPlanningBrief>;
}) {
  const [a, b] = result.scenarios;

  return (
    <>
      <BriefPanel brief={brief} />

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">On scene at {incident.label}</p>
            <h2>Candidate hospitals</h2>
          </div>
          <span className={`confidence ${result.confidence}`}>Evidence confidence: {result.confidence}</span>
        </div>
        <div className="scenario-grid">
          <ScenarioColumn evidence={a} />
          <ScenarioColumn evidence={b} />
        </div>
      </section>

      <section className="section">
        <h2>Evidence trail</h2>
        {LAYERS.map(({ key, title }) => (
          <div className="layer-group" key={key}>
            <p className="eyebrow">{title}</p>
            <div className="scenario-grid">
              <EvidenceCard title={a.scenario.name} evidence={a[key]} />
              <EvidenceCard title={b.scenario.name} evidence={b[key]} />
            </div>
          </div>
        ))}
        {result.caveats.length > 0 && (
          <div className="limits">
            <p className="eyebrow">Freshness caveats</p>
            <ul>
              {result.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
