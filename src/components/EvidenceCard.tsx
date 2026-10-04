import type { EvidenceEnvelope } from "../domain/types";

type Props = { title: string; evidence: EvidenceEnvelope<unknown> };

export function EvidenceCard({ title, evidence }: Props) {
  return (
    <article className="evidence-card">
      <div className="card-topline"><span>{title}</span><span className={`status ${evidence.status}`}>{evidence.status}</span></div>
      <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.source}</a>
      <p>{evidence.caveat}</p>
      <dl>
        <div><dt>Retrieved</dt><dd>{new Date(evidence.retrievedAt).toLocaleString()}</dd></div>
        <div><dt>Observed</dt><dd>{evidence.observedAt ? new Date(evidence.observedAt).toLocaleString() : "Not supplied"}</dd></div>
      </dl>
    </article>
  );
}

