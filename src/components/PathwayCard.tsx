import type { ScenarioEvidence } from "../domain/types";
import { freshnessLabel, statusLabel } from "./freshness";

/**
 * One declared pathway. Road context and crowding context are separate panels on purpose:
 * they are never merged into one score, and neither panel implies a better destination.
 */
export function PathwayCard({ evidence, accent }: { evidence: ScenarioEvidence; accent: "a" | "b" }) {
  const { traffic, crowding } = evidence;
  return (
    <article className={`pathway pathway-${accent}`}>
      <p className="eyebrow">Declared pathway</p>
      <h3>{evidence.scenario.name}</h3>
      <p className="corridor">{evidence.scenario.declaredCorridor}</p>

      <div className="panel panel-road">
        <div className="panel-top"><span>Road context</span><span className={`status ${traffic.status}`}>{statusLabel(traffic.status)}</span></div>
        <p className="panel-label">Corridor journey time</p>
        {traffic.data
          ? <p className="figure">{traffic.data.journeyMinutes}<small> min</small></p>
          : <p className="figure figure-empty">Unavailable</p>}
        <p className="panel-note">{freshnessLabel(traffic)}</p>
      </div>

      <div className="panel panel-crowding">
        <div className="panel-top"><span>Crowding context</span><span className={`status ${crowding.status}`}>{statusLabel(crowding.status)}</span></div>
        <p className="panel-label">Published bed-wait context</p>
        {crowding.data ? (
          <>
            <p className="figure">{crowding.data.patientsWaitingForBeds}<small> patients waiting for beds</small></p>
            <p className="panel-note">{freshnessLabel(crowding)}</p>
          </>
        ) : (
          <>
            <p className="figure figure-empty">Unavailable</p>
            <p className="panel-note">No published figure captured for this pathway. Not estimated.</p>
          </>
        )}
      </div>

      <p className="small">A published daily count of patients waiting for beds. Not an ED wait time, a hospital capacity statement or a destination recommendation.</p>
    </article>
  );
}
