import { createPlanningBrief } from "./brief/createPlanningBrief";
import { EvidenceCard } from "./components/EvidenceCard";
import { ScenarioColumn } from "./components/ScenarioColumn";
import { dfbTallaght, incident, scenarios } from "./data/fixtures";
import { useComparison } from "./state/useComparison";

export default function App() {
  const state = useComparison(scenarios.a.scenario, scenarios.b.scenario);

  return (
    <main>
      <div className="banner" role="note">Simulated planning comparison only. Not for ambulance dispatch, hospital selection, triage or clinical decision-making. Final decisions rest with dispatch and clinical teams.</div>
      <header className="hero">
        <p className="eyebrow">Build for Ireland</p>
        <h1>Beat</h1>
        <p className="lede">A simulated emergency-flow planning comparison for Dublin.</p>
      </header>

      {state.phase === "loading" && <section className="section"><p>Loading evidence…</p></section>}
      {state.phase === "error" && <section className="section"><p>Evidence could not be loaded: {state.message}. Human review is requested.</p></section>}
      {state.phase === "ready" && <Ready result={state.result} />}
    </main>
  );
}

function Ready({ result }: { result: import("./domain/types").ComparisonResult }) {
  const [a, b] = result.scenarios;
  const brief = createPlanningBrief(result);
  return (
    <>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">{incident.location} · fixed demonstration scene</p><h2>{incident.title}</h2></div><span className={`confidence ${result.confidence}`}>Evidence confidence: {result.confidence}</span></div>
        <p className="question">Which of two pre-declared pathways shows lower planning friction right now, and what evidence drove that?</p>
        <div className="scenario-grid"><ScenarioColumn evidence={a} /><ScenarioColumn evidence={b} /></div>
        <p className="diff">
          {result.trafficDeltaMinutes !== undefined ? `Road time differs by ${result.trafficDeltaMinutes} min.` : "Road time cannot be compared."}{" "}
          {result.crowdingDifference !== undefined ? `Bed-wait context differs by ${Math.abs(result.crowdingDifference)} patients.` : "Bed-wait context cannot be compared (a source is unavailable)."}
        </p>
      </section>

      <section className="section">
        <h2>Evidence trail</h2>
        <div className="evidence-grid">
          <EvidenceCard title="Road: Scenario A" role="Core road-corridor journey time" evidence={a.traffic} />
          <EvidenceCard title="Road: Scenario B" role="Core road-corridor journey time" evidence={b.traffic} />
          <EvidenceCard title="Transit" role="Corroborating context only; never used to infer road speed" evidence={a.transit} />
          <EvidenceCard title="Crowding: Scenario A" role="Published bed-wait context, not ED wait time" evidence={a.crowding} />
          <EvidenceCard title="Crowding: Scenario B" role="Published bed-wait context, not ED wait time" evidence={b.crowding} />
          <article className="evidence-card">
            <div className="card-topline"><span>Historical demand</span><span className="status replayed">saved snapshot</span></div>
            <p className="role">Retrospective context only; not live demand</p>
            <a href={dfbTallaght.sourceUrl} target="_blank" rel="noreferrer">{dfbTallaght.source}</a>
            <p className="freshness">Aggregate for {dfbTallaght.from} to {dfbTallaght.to}</p>
            <p>{dfbTallaght.stationArea}: {dfbTallaght.incidents.toLocaleString("en-IE")} of {dfbTallaght.total.toLocaleString("en-IE")} ambulance incidents. {dfbTallaght.caveat}</p>
          </article>
        </div>
      </section>

      <section className={`section brief${brief.abstained ? " abstained" : ""}`}>
        <p className="eyebrow">Reviewable output</p>
        <h2>{brief.title}</h2>
        <p>{brief.summary}</p>
        {brief.claims.length > 0 && (
          <>
            <h3>Claims and sources</h3>
            <ul>{brief.claims.map((claim) => <li key={claim.text}>{claim.text}<span className="citation">{claim.citation}</span></li>)}</ul>
          </>
        )}
        <h3>Uncertainty and missing sources</h3>
        <ul>{brief.uncertainty.length ? brief.uncertainty.map((item) => <li key={item}>{item}</li>) : <li>None reported.</li>}</ul>
        <p className="boundary">{brief.boundary}</p>
      </section>
    </>
  );
}
