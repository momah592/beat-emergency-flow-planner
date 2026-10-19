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
  it("names the shorter corridor as a difference, not a pick", () => {
    const { a, b } = evidenceVariants()[0];
    const result = compareScenarios(a, b);
    const brief = createPlanningBrief(result);
    const corridor = brief.claims.find((claim) => claim.id === "corridor-journey")!;
    const lead = result.trafficLead === "a" ? a : b;

    // Derived from the fixtures rather than hardcoded, so real public-data
    // values can change without breaking the test.
    expect(corridor.statement).toContain(lead.scenario.name);
    expect(corridor.statement).toContain(`${result.trafficDeltaMinutes} minute`);
    expect(brief.summary.headline).toContain(`${result.trafficDeltaMinutes} minute`);
    expect(brief.summary.detail).toMatch(/road context only/i);
    expect(brief.summary.abstained).toBe(false);
  });

  it("drops the transit claim when no transit feed returned data", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    expect(brief.claims.map((claim) => claim.id)).not.toContain("transit-context");
  });

  it("cites both traffic and trolley evidence under the summary", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    const cited = brief.summary.basis.map((basis) => basis.source);
    expect(cited).toContain("DCC TRIPS");
    expect(cited).toContain("INMO Trolley Watch");
  });

  it("keeps road time and crowding as separate signals", () => {
    const { a, b } = evidenceVariants()[0];
    const brief = createPlanningBrief(compareScenarios(a, b));
    expect(brief.summary.detail).toMatch(/separate crowding signal/i);
  });

  it("lists non-live inputs under uncertainty", () => {
    const { a, b } = evidenceVariants()[0];
    const result = compareScenarios(a, b);
    expect(createPlanningBrief(result).uncertainty).toEqual(result.caveats);
  });

  it("singularises a one-minute difference", () => {
    const { a, b } = evidenceVariants()[0];
    const minutes = a.traffic.data!.journeyMinutes;
    const nudged = { ...b, traffic: { ...b.traffic, data: { ...b.traffic.data!, journeyMinutes: minutes + 1 } } };
    const brief = createPlanningBrief(compareScenarios(a, nudged));
    expect(brief.claims[0].statement).toContain("1 minute.");
    expect(brief.claims[0].statement).not.toContain("1 minutes");
    expect(brief.summary.headline).toBe("Road time differs by 1 minute");
  });
});
