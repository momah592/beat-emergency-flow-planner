import type { ScenarioEvidence } from "../domain/types";

export function ScenarioColumn({ evidence }: { evidence: ScenarioEvidence }) {
  return (
    <section className="scenario-column">
      <p className="eyebrow">Declared pathway</p>
      <h3>{evidence.scenario.name}</h3>
      <p>{evidence.scenario.declaredCorridor}</p>
      <div className="metric"><span>Observed corridor journey</span><strong>{evidence.traffic.data ? `${evidence.traffic.data.journeyMinutes} min` : "Unavailable"}</strong></div>
      <div className="metric"><span>Published bed-wait context</span><strong>{evidence.crowding.data ? `${evidence.crowding.data.patientsWaitingForBeds} patients` : "Unavailable"}</strong></div>
      <p className="small">The bed-wait figure is not an ED wait time, hospital capacity statement or destination recommendation.</p>
    </section>
  );
}

