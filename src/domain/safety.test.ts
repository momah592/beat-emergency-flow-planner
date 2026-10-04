import { describe, expect, it } from "vitest";
import { createPlanningBrief, DISCLAIMER } from "../brief/createPlanningBrief";
import { briefToText } from "../brief/briefToText";
import { evidenceVariants } from "../brief/testScenarios";
import { compareScenarios } from "./compareScenarios";

/**
 * The product recommends a route, so directive language is expected. What is
 * tested here is that the recommendation stays honest about what the sources
 * actually measure, and that it withholds a suggestion when it cannot support one.
 */
describe("recommendation accuracy", () => {
  for (const variant of evidenceVariants()) {
    describe(variant.name, () => {
      const result = compareScenarios(variant.a, variant.b);
      const brief = createPlanningBrief(result);

      it("suggests a route only when both corridor times are available", () => {
        const bothTraffic = variant.a.traffic.data !== undefined && variant.b.traffic.data !== undefined;
        if (!bothTraffic) {
          expect(brief.recommendation.pathwayId).toBeUndefined();
          expect(brief.recommendation.headline).toMatch(/no route suggested/i);
        }
      });

      it("suggests the corridor the engine found shorter, never the other one", () => {
        if (brief.recommendation.pathwayId !== undefined) {
          expect(brief.recommendation.pathwayId).toBe(result.trafficLead);
        }
      });

      it("never presents the journey time as a blue-light estimate", () => {
        const text = `${brief.recommendation.headline} ${brief.recommendation.rationale}`;
        expect(text).not.toMatch(/\b(?:eta|arrival time|response time|blue.?light)\b/i);
        expect(brief.limitations.join(" ")).toMatch(/not blue-light response estimates/i);
      });

      it("never presents the trolley count as a wait time or live capacity", () => {
        const bedWait = brief.claims.find((claim) => claim.id === "bed-wait-context")!;
        expect(bedWait.statement).not.toMatch(/\b(?:ed|emergency department) wait/i);
        expect(bedWait.statement).not.toMatch(/\bcapacity\b/i);
        expect(brief.limitations.join(" ")).toMatch(/not an emergency department waiting time/i);
      });

      it("keeps the limitations and disclaimer intact", () => {
        expect(brief.limitations.length).toBeGreaterThanOrEqual(3);
        expect(brief.disclaimer).toBe(DISCLAIMER);
        expect(briefToText(brief)).toContain(DISCLAIMER);
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
    expect(result.trafficDeltaMinutes).toBeUndefined();
    expect(result.confidence).toBe("insufficient");
  });

  it("withholds a suggestion when one side has no evidence at all", () => {
    const variant = evidenceVariants().find((item) => item.name === "one side only")!;
    const brief = createPlanningBrief(compareScenarios(variant.a, variant.b));
    expect(brief.recommendation.pathwayId).toBeUndefined();
  });
});
