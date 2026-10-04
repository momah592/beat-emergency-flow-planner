import { hardcodedDemo } from "./demoData"
import "./hardcoded.css"

const formatTime = (iso: string | null) => {
  if (!iso) return "Not supplied"
  return new Date(iso).toLocaleString()
}

export const HardcodedDemo = () => {
  const { incident, processSteps, evidence, scenarios, comparison, brief } = hardcodedDemo
  const scenarioA = scenarios[0]
  const scenarioB = scenarios[1]

  return (
    <main className="hc-page">
      <header className="hc-hero">
        <div className="hc-hero-copy">
          <p className="hc-kicker">Build for Ireland · Hardcoded process demo</p>
          <h1>Healthy Traffic</h1>
          <p className="hc-subtitle">Dublin Emergency Flow Simulator</p>
          <p className="hc-lede">
            Given a simulated incident location, Healthy Traffic shows how live road conditions and hospital
            crowding might affect the wider emergency pathway — while final routing stays with
            dispatch / clinical teams.
          </p>
          <p className="hc-metric">{comparison.keyMetric}</p>
          <p className="hc-warning">
            Planning prototype only. Not for ambulance dispatch, hospital selection, triage, or
            clinical decision-making. Values on this page are hardcoded for a fast end-to-end demo.
          </p>
        </div>
      </header>

      <section className="hc-section" aria-labelledby="process-heading">
        <div className="hc-section-head">
          <div>
            <p className="hc-eyebrow">Process</p>
            <h2 id="process-heading">How Healthy Traffic works</h2>
          </div>
        </div>
        <ol className="hc-process">
          {processSteps.map((step) => (
            <li key={step.id} className="hc-process-step">
              <span className="hc-step-num" aria-hidden="true">{step.id}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="hc-section" aria-labelledby="incident-heading">
        <div className="hc-section-head">
          <div>
            <p className="hc-eyebrow">Step 1 · Simulated incident</p>
            <h2 id="incident-heading">{incident.title}</h2>
          </div>
          <span className="hc-pill hc-pill-warn">Simulated</span>
        </div>
        <dl className="hc-meta-grid">
          <div>
            <dt>Location</dt>
            <dd>{incident.location}</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{incident.timestampLabel}</dd>
          </div>
          <div>
            <dt>Acuity</dt>
            <dd>{incident.acuity}</dd>
          </div>
          <div>
            <dt>Authority</dt>
            <dd>{incident.framing}</dd>
          </div>
        </dl>
      </section>

      <section className="hc-section" aria-labelledby="evidence-heading">
        <div className="hc-section-head">
          <div>
            <p className="hc-eyebrow">Step 2 · Public evidence</p>
            <h2 id="evidence-heading">Source-grounded signals</h2>
          </div>
          <span className={`hc-pill hc-confidence-${comparison.confidence}`}>
            Confidence: {comparison.confidence}
          </span>
        </div>
        <p className="hc-section-note">{comparison.confidenceWhy}</p>
        <div className="hc-evidence-grid">
          {evidence.map((item) => (
            <article key={item.id} className="hc-card" aria-label={`${item.title} evidence`}>
              <div className="hc-card-top">
                <h3>{item.title}</h3>
                <span className={`hc-status hc-status-${item.status}`}>{item.status}</span>
              </div>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                {item.source}
              </a>
              <p className="hc-role">{item.role}</p>
              <p className="hc-value">{item.value}</p>
              <dl className="hc-times">
                <div>
                  <dt>Retrieved</dt>
                  <dd>{formatTime(item.retrievedAt)}</dd>
                </div>
                <div>
                  <dt>Observed</dt>
                  <dd>{formatTime(item.observedAt)}</dd>
                </div>
                <div>
                  <dt>Freshness</dt>
                  <dd>{item.freshnessLabel}</dd>
                </div>
              </dl>
              <p className="hc-caveat">{item.caveat}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hc-section" aria-labelledby="compare-heading">
        <div className="hc-section-head">
          <div>
            <p className="hc-eyebrow">Step 3 · Declared pathway comparison</p>
            <h2 id="compare-heading">Nearest vs flow-aware</h2>
          </div>
        </div>
        <div className="hc-scenario-grid">
          {[scenarioA, scenarioB].map((scenario) => (
            <article
              key={scenario.id}
              className={`hc-scenario hc-scenario-${scenario.id}`}
              aria-label={scenario.pathwayType}
            >
              <p className="hc-eyebrow">{scenario.label}</p>
              <h3>{scenario.pathwayType}</h3>
              <p className="hc-hospital">{scenario.hospital}</p>
              <p className="hc-corridor">{scenario.corridor}</p>
              <div className="hc-metrics">
                <div className="hc-metric-row">
                  <span>Observed corridor journey</span>
                  <strong>{scenario.journeyMinutes} min</strong>
                </div>
                <div className="hc-metric-row">
                  <span>Published bed-wait context</span>
                  <strong>{scenario.patientsWaitingForBeds}</strong>
                </div>
              </div>
              <ul>
                {scenario.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="hc-caveat">
                Bed-wait figure is not ED wait time, hospital capacity, or a destination
                recommendation.
              </p>
            </article>
          ))}
        </div>

        <div className="hc-tradeoff" role="region" aria-label="Planning trade-off">
          <p className="hc-eyebrow">Trade-off surfaced</p>
          <p className="hc-tradeoff-text">{comparison.tradeoff}</p>
          <div className="hc-delta-row">
            <div>
              <span>Road delta</span>
              <strong>{comparison.trafficDeltaMinutes} min</strong>
              <small>Shorter corridor on Scenario A</small>
            </div>
            <div>
              <span>Crowding delta</span>
              <strong>{comparison.crowdingDifference}</strong>
              <small>Higher bed-wait context on Scenario A</small>
            </div>
          </div>
        </div>
      </section>

      <section className="hc-section hc-brief" aria-labelledby="brief-heading">
        <div className="hc-section-head">
          <div>
            <p className="hc-eyebrow">Step 4 · Reviewable output</p>
            <h2 id="brief-heading">{brief.title}</h2>
          </div>
        </div>
        <p className="hc-approval" role="status">
          {brief.approvalLine}
        </p>
        {brief.paragraphs.map((paragraph) => (
          <p key={paragraph} className="hc-brief-p">
            {paragraph}
          </p>
        ))}
        <div className="hc-brief-blocks">
          <div>
            <h3>Uncertainty</h3>
            <ul>
              {brief.uncertainty.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Questions for human review</h3>
            <ul>
              {brief.questionsForReview.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
