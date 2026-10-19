import type { ScenarioEvidence } from "../domain/types";
import { freshnessLabel, statusLabel } from "./freshness";

/**
 * One declared pathway. Road context and crowding context are separate panels on purpose:
 * they are never merged into one score, and neither panel implies a better destination.
 */
export function PathwayCard({ evidence, accent }: { evidence: ScenarioEvidence; accent: "a" | "b" }) {
  const { traffic, crowding } = evidence;
  const [tag, ...rest] = evidence.scenario.name.split(": ");
  return (
    <article className={`pathway pathway-${accent}`}>
      <header className="pathway-head">
        <span className="badge">{accent.toUpperCase()}</span>
        <div>
          <h3>{rest.length ? rest.join(": ") : evidence.scenario.name}</h3>
          <p className="corridor">{rest.length ? `${tag} · ` : ""}{evidence.scenario.declaredCorridor}</p>
        </div>
      </header>

      <div className="panels">
        <div className="panel panel-road">
          <div className="panel-top"><span>Road context</span><span className={`status ${traffic.status}`}>{statusLabel(traffic.status)}</span></div>
          <p className="panel-label">Observed speed on TRIPS-covered links</p>
          {traffic.data ? (
            <>
              <p className="figure">{traffic.data.speedKmh}<small> km/h</small></p>
              <p className="panel-note">{traffic.data.coveragePercent}% of the {traffic.data.routeKm} km route covered · {freshnessLabel(traffic)}</p>
            </>
          ) : (
            <>
              <p className="figure figure-empty">Unavailable</p>
              <p className="panel-note">No TRIPS reading along this route. Not estimated.</p>
            </>
          )}
        </div>

        <div className="panel panel-crowding">
          <div className="panel-top"><span>Crowding context</span><span className={`status ${crowding.status}`}>{statusLabel(crowding.status)}</span></div>
          <p className="panel-label">Patients waiting for beds <span className="hint">(published daily count, not ED wait time)</span></p>
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
      </div>

    </article>
  );
}
