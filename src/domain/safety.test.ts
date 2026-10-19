import { describe, expect, it } from "vitest";
import { createPlanningBrief, DISCLAIMER } from "../brief/createPlanningBrief";
import { briefToText } from "../brief/briefToText";
import { evidenceVariants } from "../brief/testScenarios";
import { compareScenarios } from "./compareScenarios";

/**
 * Beat is a planning comparison. It shows differences and trade-offs between two declared
 * pathways and never picks a destination. These tests hold that line, stay honest about what
 * the sources measure, and check the brief abstains when evidence is missing.
 */
describe("planning-only boundary", () => {
  for (const variant of evidenceVariants()) {
    describe(variant.name, () => {
      const result = compareScenarios(variant.a, variant.b);
      const brief = createPlanningBrief(result);
      const text = briefToText(brief);

      it("abstains when either corridor time is missing", () => {
        const bothTraffic = variant.a.traffic.data !== undefined && variant.b.traffic.data !== undefined;
        expect(brief.summary.abstained).toBe(!bothTraffic);
        if (!bothTraffic) expect(brief.summary.headline).toMatch(/human review requested/i);
      });

      it("carries no destination, dispatch or pathway pick", () => {
        expect(brief).not.toHaveProperty("recommendation");
        expect(JSON.stringify(result)).not.toMatch(/recommend/i);
        expect(text).not.toMatch(/\b(?:recommended|suggested)\b|send (?:the )?(?:crew|ambulance|unit)|\bgo to\b/i);
      });

      it("never presents the journey time as a blue-light estimate", () => {
        expect(`${brief.summary.headline} ${brief.summary.detail}`).not.toMatch(/\b(?:eta|arrival time|response time|blue.?light)\b/i);
        expect(brief.limitations.join(" ")).toMatch(/not blue-light response estimates/i);
      });

      it("never presents the trolley count as a wait time or live capacity", () => {
        const bedWait = brief.claims.find((claim) => claim.id === "bed-wait-context")!;
        expect(bedWait.statement).not.toMatch(/\b(?:ed|emergency department) wait/i);
        expect(bedWait.statement).not.toMatch(/\bcapacity\b/i);
        expect(brief.limitations.join(" ")).toMatch(/not an emergency department waiting time/i);
      });

      it("keeps the limitations and planning-only disclaimer intact", () => {
        expect(brief.limitations.length).toBeGreaterThanOrEqual(3);
        expect(brief.disclaimer).toBe(DISCLAIMER);
        expect(DISCLAIMER).toMatch(/simulated planning comparison/i);
        expect(text).toContain(DISCLAIMER);
      });

      it("flags a comparison that is not live", () => {
        if (result.confidence !== "high") {
          expect(brief.limitations.join(" ")).toMatch(/not current/i);
        }
      });
    });
  }
});

describe("engine behaviour under missing evidence", () => {
  it("states no corridor difference when either corridor time is missing", () => {
    const variant = evidenceVariants().find((item) => item.name === "traffic unavailable")!;
    const result = compareScenarios(variant.a, variant.b);
    expect(result.trafficLead).toBeUndefined();
    expect(result.trafficDeltaKmh).toBeUndefined();
    expect(result.confidence).toBe("insufficient");
  });

  it("abstains when one side has no evidence at all", () => {
    const variant = evidenceVariants().find((item) => item.name === "one side only")!;
    const brief = createPlanningBrief(compareScenarios(variant.a, variant.b));
    expect(brief.summary.abstained).toBe(true);
  });
});
