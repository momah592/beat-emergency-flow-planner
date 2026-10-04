import { createPlanningBrief } from "./brief/createPlanningBrief";
import { EvidenceCard } from "./components/EvidenceCard";
import { ScenarioColumn } from "./components/ScenarioColumn";
import { scenarios } from "./data/fixtures";
import { compareScenarios } from "./domain/compareScenarios";

const result = compareScenarios(scenarios.a, scenarios.b);

export default function App() {
  const brief = createPlanningBrief(result);
  return (
    <main>
      <header className="hero">
        <p className="eyebrow">Build for Ireland</p>
        <h1>Beat</h1>
        <p className="lede">A simulated emergency-flow planning comparison for Dublin.</p>
        <p className="warning">Planning prototype only. Not for ambulance dispatch, hospital selection, triage or clinical decision-making.</p>
      </header>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">Simulated incident</p><h2>Dublin 2 high-acuity scenario</h2></div><span className={`confidence ${result.confidence}`}>Evidence confidence: {result.confidence}</span></div>
        <div className="scenario-grid"><ScenarioColumn evidence={scenarios.a} /><ScenarioColumn evidence={scenarios.b} /></div>
      </section>

      <section className="section"><h2>Evidence trail</h2><div className="evidence-grid"><EvidenceCard title="Traffic" evidence={scenarios.a.traffic} /><EvidenceCard title="Transit" evidence={scenarios.a.transit} /><EvidenceCard title="Crowding context" evidence={scenarios.a.crowding} /></div></section>

      <section className="section brief"><p className="eyebrow">Reviewable output</p><h2>Planning brief</h2><p>{brief}</p><ul>{result.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul></section>
    </main>
  );
}

