import { describe, expect, it } from "vitest";
import { sources } from "../data/sourceRegistry";
import { compareScenarios } from "../domain/compareScenarios";
import { createPlanningBrief } from "./createPlanningBrief";
import { evidenceVariants } from "./testScenarios";

const registry = Object.values(sources);
const registeredNames: string[] = registry.map((source) => source.name);
const urlByName = new Map<string, string>(registry.map((source) => [source.name, source.url]));

describe("brief traceability", () => {
  for (const variant of evidenceVariants()) {
    describe(variant.name, () => {
      const brief = createPlanningBrief(compareScenarios(variant.a, variant.b));

      it("gives every claim at least one cited basis", () => {
        expect(brief.claims.length).toBeGreaterThan(0);
        for (const claim of brief.claims) {
          expect(claim.basis.length, `claim ${claim.id}`).toBeGreaterThan(0);
        }
      });

      it("cites only sources in the registry, with the registered url", () => {
        for (const claim of brief.claims) {
          for (const basis of claim.basis) {
            expect(registeredNames, `claim ${claim.id}`).toContain(basis.source);
            expect(basis.sourceUrl).toBe(urlByName.get(basis.source));
          }
        }
      });

      it("timestamps every basis with a parseable retrieval time", () => {
        for (const claim of brief.claims) {
          for (const basis of claim.basis) {
            expect(Number.isNaN(Date.parse(basis.retrievedAt)), `claim ${claim.id}`).toBe(false);
            if (basis.observedAt !== undefined) {
              expect(Number.isNaN(Date.parse(basis.observedAt))).toBe(false);
            }
          }
        }
      });

      it("never states a figure that rests only on unavailable evidence", () => {
        for (const claim of brief.claims) {
          if (!/\d/.test(claim.statement)) continue;
          const supported = claim.basis.some((basis) => basis.status !== "unavailable");
          expect(supported, `claim ${claim.id} states a figure without available evidence`).toBe(true);
        }
      });

      it("reports the engine's confidence unchanged", () => {
        expect(brief.confidence).toBe(compareScenarios(variant.a, variant.b).confidence);
      });

      it("uses unique claim ids", () => {
        const ids = brief.claims.map((claim) => claim.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }
});

describe("brief content", () => {
  it("names the shorter corridor and suggests it", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    const corridor = brief.claims.find((claim) => claim.id === "corridor-journey")!;
    expect(corridor.statement).toContain("Scenario A");
    expect(corridor.statement).toContain("5 minutes");
    expect(brief.recommendation.pathwayId).toBe("a");
  });

  it("drops the transit claim when no transit feed returned data", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    expect(brief.claims.map((claim) => claim.id)).not.toContain("transit-context");
  });

  it("cites both traffic and trolley evidence under the recommendation", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    const cited = brief.recommendation.basis.map((basis) => basis.source);
    expect(cited).toContain("DCC TRIPS");
    expect(cited).toContain("INMO Trolley Watch");
  });

  it("says plainly when the two signals disagree", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    expect(brief.recommendation.rationale).toMatch(/opposite directions/i);
  });

  it("singularises a one-minute difference", () => {
    const { a, b } = evidenceVariants()[0];
    const nudged = { ...b, traffic: { ...b.traffic, data: { ...b.traffic.data!, journeyMinutes: 15 } } };
    const brief = createPlanningBrief(compareScenarios(a, nudged));
    expect(brief.claims[0].statement).toContain("1 minute.");
  });
});
