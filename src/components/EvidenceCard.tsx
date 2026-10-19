import type { EvidenceEnvelope } from "../domain/types";
import { freshnessLabel, statusLabel } from "./freshness";

type Props = { title: string; role: string; evidence: EvidenceEnvelope<unknown> };

const time = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IE") : "Not supplied");

export function EvidenceCard({ title, role, evidence }: Props) {
  return (
    <article className="evidence-card">
      <div className="card-topline"><span>{title}</span><span className={`status ${evidence.status}`}>{statusLabel(evidence.status)}</span></div>
      <p className="role">{role}</p>
      <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.source}</a>
      <p className="freshness">{freshnessLabel(evidence)}</p>
      <details className="caveat">
        <summary>Caveat</summary>
        <p>{evidence.caveat}</p>
      </details>
      <dl>
        <div><dt>Retrieved</dt><dd>{time(evidence.retrievedAt)}</dd></div>
        <div><dt>Observed</dt><dd>{time(evidence.observedAt)}</dd></div>
        <div><dt>Freshness</dt><dd>{evidence.freshnessSeconds !== undefined ? `${evidence.freshnessSeconds}s` : "Not supplied"}</dd></div>
      </dl>
    </article>
  );
}
