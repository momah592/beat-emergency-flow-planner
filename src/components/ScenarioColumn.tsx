import type { ScenarioEvidence } from "../domain/types";
import { freshnessLabel, statusLabel } from "./freshness";

export function ScenarioColumn({ evidence }: { evidence: ScenarioEvidence }) {
  const { traffic, crowding } = evidence;
  return (
    <section className="scenario-column">
      <p className="eyebrow">Declared pathway</p>
      <h3>{evidence.scenario.name}</h3>
      <p>{evidence.scenario.declaredCorridor}</p>
      <div className="metric road">
        <span>Road context: corridor journey time<small>{freshnessLabel(traffic)}</small></span>
        <strong>{traffic.data ? `${traffic.data.journeyMinutes} min` : "Unavailable"}<em className={`status ${traffic.status}`}>{statusLabel(traffic.status)}</em></strong>
      </div>
      <div className="metric crowding">
        <span>Crowding context: published bed-wait context<small>{freshnessLabel(crowding)}</small></span>
        <strong>{crowding.data ? `${crowding.data.patientsWaitingForBeds} patients` : "Unavailable"}<em className={`status ${crowding.status}`}>{statusLabel(crowding.status)}</em></strong>
      </div>
      <p className="small">The bed-wait figure is not an ED wait time, hospital capacity statement or destination recommendation.</p>
    </section>
  );
}
