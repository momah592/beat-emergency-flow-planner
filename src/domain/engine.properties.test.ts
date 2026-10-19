import { describe, expect, it } from "vitest";
import { scenarios } from "../data/fixtures";
import { createPlanningBrief } from "../brief/createPlanningBrief";
import { briefToText } from "../brief/briefToText";
import { compareScenarios } from "./compareScenarios";
import type { EvidenceEnvelope, EvidenceStatus, ScenarioEvidence } from "./types";

/** Small seeded PRNG so every run explores the same cases and failures are replayable. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const STATUSES: EvidenceStatus[] = ["live", "replayed", "unavailable"];

function randomEvidence(next: () => number, base: ScenarioEvidence): ScenarioEvidence {
  const pick = <T,>(items: T[]) => items[Math.floor(next() * items.length)];
  const traffic: EvidenceEnvelope<NonNullable<ScenarioEvidence["traffic"]["data"]>> = (() => {
    const status = pick(STATUSES);
    const speed = Math.round(next() * 800) / 10;
    return status === "unavailable"
      ? { ...base.traffic, status, data: undefined, freshnessSeconds: undefined }
      : {
          ...base.traffic,
          status,
          freshnessSeconds: status === "live" ? Math.floor(next() * 900) : undefined,
          data: { corridor: "c", direction: "d", speedKmh: speed, observedMinutes: 1, coveredKm: 1, routeKm: 2, coveragePercent: 50, matchedLinks: 1 },
        };
  })();
  const crowdStatus = pick(STATUSES);
  const crowding = crowdStatus === "unavailable"
    ? { ...base.crowding, status: crowdStatus, data: undefined }
    : { ...base.crowding, status: crowdStatus, data: { hospital: "H", patientsWaitingForBeds: Math.floor(next() * 80), publishedDate: "2026-10-02" } };
  return { ...base, traffic, crowding };
}

describe("compareScenarios properties (seeded, 300 random evidence pairs)", () => {
  const next = rng(20261019);
  const cases = Array.from({ length: 300 }, () => ({
    a: randomEvidence(next, scenarios.a),
    b: randomEvidence(next, scenarios.b),
  }));

  it("is deterministic: the same inputs always give an identical result", () => {
    for (const { a, b } of cases) {
      expect(compareScenarios(a, b)).toEqual(compareScenarios(a, b));
    }
  });

  it("does not mutate its inputs", () => {
    for (const { a, b } of cases.slice(0, 50)) {
      const before = JSON.stringify([a, b]);
      compareScenarios(a, b);
      expect(JSON.stringify([a, b])).toBe(before);
    }
  });

  it("is symmetric: swapping A and B flips the lead and negates the crowding difference", () => {
    for (const { a, b } of cases) {
      const forward = compareScenarios(a, b);
      const swapped = compareScenarios(b, a);
      expect(swapped.trafficDeltaKmh).toBe(forward.trafficDeltaKmh);
      expect(swapped.confidence).toBe(forward.confidence);
      if (forward.trafficLead) expect(swapped.trafficLead).toBe(forward.trafficLead === "a" ? "b" : "a");
      else expect(swapped.trafficLead).toBeUndefined();
      if (forward.crowdingDifference !== undefined) expect(swapped.crowdingDifference).toBe(-forward.crowdingDifference || 0);
    }
  });

  it("names the genuinely faster corridor and the exact gap", () => {
    for (const { a, b } of cases) {
      const r = compareScenarios(a, b);
      const ta = a.traffic.data?.speedKmh;
      const tb = b.traffic.data?.speedKmh;
      if (ta === undefined || tb === undefined) {
        expect(r.trafficLead).toBeUndefined();
        expect(r.trafficDeltaKmh).toBeUndefined();
        expect(r.confidence).toBe("insufficient");
      } else {
        expect(r.trafficDeltaKmh).toBeCloseTo(Math.abs(ta - tb), 1);
        expect(r.trafficLead).toBe(ta === tb ? undefined : ta > tb ? "a" : "b");
      }
    }
  });

  it("only reports high confidence with live fresh traffic and present crowding on both sides", () => {
    for (const { a, b } of cases) {
      const r = compareScenarios(a, b);
      if (r.confidence !== "high") continue;
      for (const s of [a, b]) {
        expect(s.traffic.status).toBe("live");
        expect(s.traffic.freshnessSeconds).toBeLessThan(300);
        expect(s.crowding.status).not.toBe("unavailable");
        expect(s.crowding.data).toBeDefined();
      }
    }
  });

  it("lists every non-live input in the caveats and nothing for fully live input", () => {
    for (const { a, b } of cases) {
      const r = compareScenarios(a, b);
      const nonLive = [a.traffic, b.traffic, a.crowding, b.crowding, a.transit, b.transit].filter((e) => e.status !== "live");
      for (const e of nonLive) expect(r.caveats.some((c) => c.startsWith(e.source))).toBe(true);
    }
  });

  it("never emits recommendation, dispatch or capacity language in the result or the brief", () => {
    for (const { a, b } of cases) {
      const result = compareScenarios(a, b);
      const brief = createPlanningBrief(result);
      expect(Object.keys(result)).not.toContain("recommendation");
      expect(Object.keys(brief)).not.toContain("recommendation");
      const text = briefToText(brief);
      expect(text).not.toMatch(/\b(?:recommended|suggested)\b|send (?:the )?(?:crew|ambulance|unit)|\bgo to\b|\bED wait time is\b/i);
    }
  });

  it("brief abstains exactly when corridor times are not comparable", () => {
    for (const { a, b } of cases) {
      const result = compareScenarios(a, b);
      const brief = createPlanningBrief(result);
      expect(brief.summary.abstained).toBe(result.confidence === "insufficient");
      expect(brief.confidence).toBe(result.confidence);
    }
  });

  it("every claim figure in the brief rests on available evidence", () => {
    for (const { a, b } of cases) {
      const brief = createPlanningBrief(compareScenarios(a, b));
      for (const claim of brief.claims) {
        if (/\d/.test(claim.statement)) expect(claim.basis.some((x) => x.status !== "unavailable"), JSON.stringify(claim)).toBe(true);
      }
    }
  });
});

describe("engine edge cases", () => {
  it("handles zero and equal observed speeds", () => {
    const zero = (s: ScenarioEvidence): ScenarioEvidence => ({ ...s, traffic: { ...s.traffic, data: { ...s.traffic.data!, speedKmh: 0 } } });
    const r = compareScenarios(zero(scenarios.a), zero(scenarios.b));
    expect(r.trafficLead).toBeUndefined();
    expect(r.trafficDeltaKmh).toBe(0);
    expect(createPlanningBrief(r).summary.headline).toMatch(/no difference/i);
  });

  it("treats a live reading of exactly 300s as not fresh", () => {
    const live = (s: ScenarioEvidence, sec: number): ScenarioEvidence => ({
      ...s,
      traffic: { ...s.traffic, status: "live", freshnessSeconds: sec },
      crowding: { ...s.crowding, status: "replayed", data: { hospital: "H", patientsWaitingForBeds: 1, publishedDate: "x" } },
    });
    expect(compareScenarios(live(scenarios.a, 299), live(scenarios.b, 299)).confidence).toBe("high");
    expect(compareScenarios(live(scenarios.a, 300), live(scenarios.b, 299)).confidence).toBe("limited");
  });

  it("treats a live reading with no freshness as not fresh", () => {
    const l = (s: ScenarioEvidence): ScenarioEvidence => ({ ...s, traffic: { ...s.traffic, status: "live", freshnessSeconds: undefined } });
    expect(compareScenarios(l(scenarios.a), l(scenarios.b)).confidence).not.toBe("high");
  });
});
