import { describe, expect, it } from "vitest";
import { scenarios } from "../data/fixtures";
import { compareScenarios } from "../domain/compareScenarios";
import type { ScenarioEvidence } from "../domain/types";
import { createPlanningBrief } from "./createPlanningBrief";

const noTraffic = (s: ScenarioEvidence): ScenarioEvidence => ({ ...s, traffic: { ...s.traffic, status: "unavailable", data: undefined } });

describe("createPlanningBrief", () => {
  it("cites a source and time for every claim and lists uncertainty separately", () => {
    const brief = createPlanningBrief(compareScenarios(scenarios.a, scenarios.b));
    expect(brief.abstained).toBe(false);
    expect(brief.claims.length).toBeGreaterThan(0);
    for (const claim of brief.claims) expect(claim.citation).toMatch(/retrieved/);
    expect(brief.uncertainty.length).toBeGreaterThan(0);
    expect(brief.boundary).toMatch(/simulated planning comparison/i);
  });

  it("states unavailable crowding rather than inventing it", () => {
    const brief = createPlanningBrief(compareScenarios(scenarios.a, scenarios.b));
    expect(brief.claims.some((c) => /unavailable\. Nothing is estimated/.test(c.text))).toBe(true);
    expect(brief.summary).toMatch(/cannot be compared/);
  });

  it("abstains and requests human review when traffic evidence is missing", () => {
    const brief = createPlanningBrief(compareScenarios(noTraffic(scenarios.a), noTraffic(scenarios.b)));
    expect(brief.abstained).toBe(true);
    expect(brief.claims).toEqual([]);
    expect(brief.summary).toMatch(/human review/i);
  });

  it("never gives dispatch, destination or clinical instructions", () => {
    const text = JSON.stringify(createPlanningBrief(compareScenarios(scenarios.a, scenarios.b)));
    expect(text).not.toMatch(/recommend(ed)? (hospital|destination)|send (the )?(crew|ambulance)|go to/i);
  });
});
