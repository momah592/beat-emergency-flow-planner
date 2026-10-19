import type { PlanningBrief } from "../brief/types";
import { formatTimestamp } from "./formatTime";

/**
 * Renders the brief so that no claim can be read apart from the source and
 * retrieval time it rests on, and so uncertainty is as visible as the findings.
 */
export function BriefPanel({ brief }: { brief: PlanningBrief }) {
  const { summary } = brief;
  return (
    <section className={`block brief${summary.abstained ? " abstained" : ""}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reviewable output</p>
          <h2>{brief.title}</h2>
        </div>
        <span className={`confidence ${brief.confidence}`}>Evidence confidence: {brief.confidence}</span>
      </div>

      <h3>Summary</h3>
      <div className={`summary${summary.abstained ? " summary-abstain" : ""}`}>
        <p className="summary-headline">{summary.headline}</p>
        <p className="summary-detail">{summary.detail}</p>
      </div>

      {brief.claims.length > 0 && (
        <>
          <h3>Claims with sources</h3>
          <ol className="claim-list">
            {brief.claims.map((claim) => (
              <li key={claim.id} className="claim">
                <p className="eyebrow">{claim.label}</p>
                <p className="claim-statement">{claim.statement}</p>
                <ul className="basis-list">
                  {claim.basis.map((basis) => (
                    <li key={`${basis.source}-${basis.status}-${basis.retrievedAt}-${basis.observedAt ?? ""}`} className="basis">
                      <a href={basis.sourceUrl} target="_blank" rel="noreferrer">{basis.source}</a>
                      <span className={`status ${basis.status}`}>{basis.status === "replayed" ? "saved snapshot" : basis.status}</span>
                      <span className="basis-time">
                        Retrieved {formatTimestamp(basis.retrievedAt)}
                        {basis.observedAt ? ` · observed ${formatTimestamp(basis.observedAt)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}

      <h3>Uncertainty and missing sources</h3>
      <div className="uncertainty">
        <ul>
          {brief.uncertainty.length
            ? brief.uncertainty.map((item) => {
                const cut = item.indexOf(": ");
                return <li key={item}>{cut > 0 ? <><strong>{item.slice(0, cut)}</strong> {item.slice(cut + 2)}</> : item}</li>;
              })
            : <li>No stale or unavailable inputs reported.</li>}
        </ul>
      </div>

      <div className="limits">
        <p className="eyebrow">What this data does not measure</p>
        <ul>{brief.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </div>

      <p className="disclaimer"><strong>Boundary statement.</strong> {brief.disclaimer}</p>
    </section>
  );
}
