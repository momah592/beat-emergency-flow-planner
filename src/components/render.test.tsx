import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createPlanningBrief } from "../brief/createPlanningBrief";
import { scenarios } from "../data/fixtures";
import { compareScenarios } from "../domain/compareScenarios";
import type { ScenarioEvidence } from "../domain/types";
import { BriefPanel } from "./BriefPanel";
import { EvidenceCard } from "./EvidenceCard";
import { PathwayCard } from "./PathwayCard";

const noCrowding = (s: ScenarioEvidence): ScenarioEvidence => ({ ...s, crowding: { ...s.crowding, status: "unavailable", data: undefined } });
const noTraffic = (s: ScenarioEvidence): ScenarioEvidence => ({ ...s, traffic: { ...s.traffic, status: "unavailable", data: undefined } });
const FORBIDDEN = /\b(?:recommended|suggested route|best (?:hospital|route|pathway)|send (?:the )?(?:crew|ambulance)|ED wait time is)\b/i;

describe("PathwayCard", () => {
  it("shows road and crowding as separate labelled panels with status and freshness", () => {
    const html = renderToStaticMarkup(<PathwayCard evidence={scenarios.b} accent="b" />);
    expect(html).toContain("Road context");
    expect(html).toContain("Crowding context");
    expect(html).toContain("18.3");
    expect(html).toContain("10<small> patients waiting for beds");
    expect(html).toContain("saved snapshot");
    expect(html).toMatch(/Saved snapshot from/);
  });
  it("shows Unavailable instead of a number when data is missing", () => {
    const html = renderToStaticMarkup(<PathwayCard evidence={noTraffic(noCrowding(scenarios.a))} accent="a" />);
    expect(html.match(/Unavailable/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toMatch(/\d+(\.\d+)?<small> min/);
    expect(html).not.toMatch(/patients waiting for beds<\/small>/);
  });
  it("labels the bed-wait figure precisely and never as ED wait time or capacity", () => {
    const html = renderToStaticMarkup(<PathwayCard evidence={scenarios.b} accent="b" />);
    expect(html).toContain("Published bed-wait context");
    expect(html).toMatch(/Not an ED wait time, a hospital capacity statement or a destination recommendation/);
    expect(html).not.toMatch(FORBIDDEN);
  });
});

describe("EvidenceCard", () => {
  it("shows source link, role, status, and 'Not supplied' for missing times", () => {
    const html = renderToStaticMarkup(<EvidenceCard title="Transit" role="Corroborating context only" evidence={{ ...scenarios.a.transit, observedAt: undefined }} />);
    expect(html).toContain('href="https://data.gov.ie/dataset/nta-gtfs');
    expect(html).toContain("Corroborating context only");
    expect(html).toContain("unavailable");
    // Observed and freshness are not supplied; retrieved is.
    expect(html.match(/Not supplied/g)!.length).toBe(2);
  });
  it("escapes caveat text rather than injecting markup", () => {
    const html = renderToStaticMarkup(<EvidenceCard title="T" role="R" evidence={{ ...scenarios.a.transit, caveat: "<img src=x onerror=alert(1)>" }} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("BriefPanel", () => {
  it("renders summary, cited claims, uncertainty and the boundary statement", () => {
    const html = renderToStaticMarkup(<BriefPanel brief={createPlanningBrief(compareScenarios(scenarios.a, scenarios.b))} />);
    for (const heading of ["Summary", "Claims with sources", "Uncertainty and missing sources", "Boundary statement"]) expect(html).toContain(heading);
    expect(html).toMatch(/Retrieved/);
    expect(html).toContain("Simulated planning brief");
    expect(html).not.toMatch(FORBIDDEN);
  });
  it("abstains visibly and states no corridor figure or difference when traffic is missing", () => {
    const brief = createPlanningBrief(compareScenarios(noTraffic(scenarios.a), noTraffic(scenarios.b)));
    const html = renderToStaticMarkup(<BriefPanel brief={brief} />);
    expect(html).toContain("abstained");
    expect(html).toContain("Human review requested");
    expect(html).not.toMatch(/shorter observed/i);
    expect(html).not.toMatch(/Road time differs/);
    expect(html).toContain("No comparable observed journey time");
  });
});

describe("planning-simulation wording required by AGENTS.md", () => {
  it("includes the exact dispatcher-approval line in every brief variant", () => {
    const line = "This is a planning simulation; dispatcher approval required.";
    const variants = [
      compareScenarios(scenarios.a, scenarios.b),
      compareScenarios(noTraffic(scenarios.a), noTraffic(scenarios.b)),
      compareScenarios(noCrowding(scenarios.a), noCrowding(scenarios.b)),
    ];
    for (const v of variants) {
      const brief = createPlanningBrief(v);
      expect(brief.disclaimer).toContain(line);
      expect(renderToStaticMarkup(<BriefPanel brief={brief} />)).toContain(line);
    }
  });
});
