import type { PlanningBrief } from "../brief/types";
import { formatTimestamp } from "./formatTime";

/**
 * Renders the brief so that no claim can be read apart from the source and
 * retrieval time it rests on, and so the stated limits are as visible as the
 * findings.
 */
export function BriefPanel({ brief }: { brief: PlanningBrief }) {
  return (
    <section className="section brief">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reviewable output</p>
          <h2>{brief.title}</h2>
        </div>
        <span className={`confidence ${brief.confidence}`}>Evidence confidence: {brief.confidence}</span>
      </div>

      <div className={`recommendation${brief.recommendation.pathwayId ? "" : " recommendation-none"}`}>
        <p className="eyebrow">Suggested route</p>
        <p className="recommendation-headline">{brief.recommendation.headline}</p>
        <p className="recommendation-rationale">{brief.recommendation.rationale}</p>
      </div>

      <ol className="claim-list">
        {brief.claims.map((claim) => (
          <li key={claim.id} className="claim">
            <p className="eyebrow">{claim.label}</p>
            <p className="claim-statement">{claim.statement}</p>
            <ul className="basis-list">
              {claim.basis.map((basis) => (
                <li key={`${basis.source}-${basis.retrievedAt}`} className="basis">
                  <a href={basis.sourceUrl} target="_blank" rel="noreferrer">{basis.source}</a>
                  <span className={`status ${basis.status}`}>{basis.status}</span>
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

      <div className="limits">
        <p className="eyebrow">What this data does not measure</p>
        <ul>
          {brief.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>

      <p className="disclaimer">{brief.disclaimer}</p>
    </section>
  );
}
