import type { PlanningBrief } from "../brief/types";
import { formatTimestamp } from "./formatTime";

/**
 * Renders the brief so that no claim can be read apart from the source and
 * retrieval time it rests on. The summary and boundary statement are always visible;
 * the supporting detail folds away to keep the page simple.
 */
export function BriefPanel({ brief }: { brief: PlanningBrief }) {
  const { summary } = brief;
  return (
    <section id="brief" className={`block brief${summary.abstained ? " abstained" : ""}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reviewable output</p>
          <h2>{brief.title}</h2>
        </div>
        <span className={`confidence ${brief.confidence}`}>Evidence confidence: {brief.confidence}</span>
      </div>

      <div className={`summary${summary.abstained ? " summary-abstain" : ""}`}>
        <p className="eyebrow">Summary</p>
        <p className="summary-headline">{summary.headline}</p>
        <p className="summary-detail">{summary.detail}</p>
      </div>

      <details className="fold fold-inner">
        <summary><span className="fold-title">Claims with sources</span><span className="fold-sub">{brief.claims.length} claims, each with its source and time</span></summary>
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
      </details>

      <details className="fold fold-inner" open={summary.abstained || undefined}>
        <summary><span className="fold-title">Uncertainty and missing sources</span><span className="fold-sub">{brief.uncertainty.length ? `${brief.uncertainty.length} inputs are saved, stale or unavailable` : "None reported"}</span></summary>
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
      </details>

      <details className="fold fold-inner">
        <summary><span className="fold-title">What this data does not measure</span><span className="fold-sub">Limits of the sources</span></summary>
        <div className="limits"><ul>{brief.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>
      </details>

      <p className="disclaimer"><strong>Boundary statement.</strong> {brief.disclaimer}</p>
    </section>
  );
}
