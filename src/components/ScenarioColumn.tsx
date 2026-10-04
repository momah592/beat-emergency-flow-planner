import type { ScenarioEvidence } from "../domain/types";

export function ScenarioColumn({ evidence }: { evidence: ScenarioEvidence }) {
  return (
    <section className="scenario-column">
      <p className="eyebrow">Candidate hospital</p>
      <h3>{evidence.scenario.name}</h3>
      <p>{evidence.scenario.namedHospital}</p>
      <div className="metric"><span>Observed corridor journey</span><strong>{evidence.traffic.data ? `${evidence.traffic.data.journeyMinutes} min` : "Unavailable"}</strong></div>
      <div className="metric"><span>Published trolley count</span><strong>{evidence.crowding.data ? `${evidence.crowding.data.patientsWaitingForBeds} patients` : "Unavailable"}</strong></div>
      <p className="small">A published daily trolley count. Not an ED wait time and not a live capacity reading.</p>
    </section>
  );
}

