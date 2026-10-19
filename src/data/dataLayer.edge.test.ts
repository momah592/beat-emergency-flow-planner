import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTripsCsv, tripsEnvelopeFromCsv, transitEnvelopeFromFeed } from "./adapters";
import { dfbEnvelope, scenarios } from "./fixtures";
import { sources } from "./sourceRegistry";
import { loadScenarioEvidence } from "./loadScenarioEvidence";

afterEach(() => vi.unstubAllGlobals());

const HEADER = "Timestamp,Route,Link,Direction,STT,AccSTT,TCS1,TCS2";

describe("parseTripsCsv edge cases", () => {
  it("handles CRLF line endings and trailing blank lines", () => {
    const rows = parseTripsCsv(`${HEADER}\r\n20260101-1000,16,1,1,60,60,0,0\r\n\r\n`);
    expect(rows).toHaveLength(1);
    expect(rows[0].accSeconds).toBe(60);
  });
  it("drops rows with non-numeric fields instead of producing NaN journeys", () => {
    const rows = parseTripsCsv(`${HEADER}\n20260101-1000,16,1,1,60,abc,0,0\n20260101-1000,16,2,1,60,120,0,0`);
    expect(rows).toHaveLength(1);
    expect(rows[0].link).toBe(2);
  });
  it("returns nothing when a required column is missing", () => {
    expect(parseTripsCsv("Timestamp,Route\n1,2")).toEqual([]);
    expect(parseTripsCsv("")).toEqual([]);
  });
  it("uses the newest timestamp and the highest link for the journey total", () => {
    const csv = [HEADER,
      "20260101-1000,16,1,1,0,60,0,0", "20260101-1000,16,2,1,0,600,0,0",
      "20260101-1001,16,1,1,0,90,0,0", "20260101-1001,16,2,1,0,150,0,0",
      "20260101-1001,99,2,1,0,9999,0,0"].join("\n");
    const env = tripsEnvelopeFromCsv(csv, "a", "2026-01-01T10:01:00Z")!;
    expect(env.data?.journeyMinutes).toBe(2.5);
    expect(env.status).toBe("live");
    expect(env.retrievedAt).toBe("2026-01-01T10:01:00Z");
  });
  it("ignores other directions of the same route", () => {
    const csv = [HEADER, "20260101-1000,16,1,2,0,600,0,0"].join("\n");
    expect(tripsEnvelopeFromCsv(csv, "a", "R")).toBeUndefined();
  });
});

describe("transitEnvelopeFromFeed edge cases", () => {
  it("accepts a numeric-string header timestamp", () => {
    const epoch = Math.floor(Date.parse("2026-10-19T10:00:00Z") / 1000);
    const env = transitEnvelopeFromFeed({ header: { timestamp: String(epoch) }, entity: [] }, "2026-10-19T10:00:30Z")!;
    expect(env.freshnessSeconds).toBe(30);
    expect(env.observedAt).toBe("2026-10-19T10:00:00.000Z");
  });
  it("never reports negative freshness for a header time in the future", () => {
    const epoch = Math.floor(Date.parse("2026-10-19T10:05:00Z") / 1000);
    const env = transitEnvelopeFromFeed({ header: { timestamp: epoch }, entity: [] }, "2026-10-19T10:00:00Z")!;
    expect(env.freshnessSeconds).toBe(0);
  });
  it("tolerates null entities and rejects non-objects", () => {
    expect(transitEnvelopeFromFeed({ entity: [null, {}] }, "R")?.status).toBe("live");
    expect(transitEnvelopeFromFeed(null, "R")).toBeUndefined();
    expect(transitEnvelopeFromFeed("x", "R")).toBeUndefined();
    expect(transitEnvelopeFromFeed({ entity: "nope" }, "R")).toBeUndefined();
  });
  it("labels transit as supporting context, not a road-speed measure", () => {
    expect(transitEnvelopeFromFeed({ entity: [] }, "R")!.caveat).toMatch(/not a road-speed or congestion measure/i);
  });
});

describe("dfbEnvelope", () => {
  it("reports a station-area share that matches the saved aggregate", () => {
    const env = dfbEnvelope("Tallaght Fire Station");
    expect(env.status).toBe("replayed");
    expect(env.source).toBe(sources.dfb.name);
    expect(env.data?.area).toContain("14,040");
    expect(env.data?.area).toContain("83,233");
    expect(env.caveat).toMatch(/not live demand/i);
  });
  it("falls back to the all-areas total for an unknown or missing area, never a made-up count", () => {
    for (const area of [undefined, "Nowhere Fire Station"]) {
      expect(dfbEnvelope(area).data?.area).toMatch(/^All DFB station areas: 83,233/);
    }
  });
});

describe("loadScenarioEvidence", () => {
  it("never labels INMO as ED wait time or capacity in the saved crowding evidence", () => {
    for (const id of ["a", "b"] as const) {
      const c = scenarios[id].crowding;
      expect(c.caveat).toMatch(/Not ED wait time or capacity/i);
      expect(c.status).toBe("replayed");
    }
  });
  it("keeps transit unavailable, never invented, when the proxy returns garbage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const e = await loadScenarioEvidence(scenarios.a.scenario);
    expect(e.transit.status).toBe("unavailable");
    expect(e.traffic.status).toBe("replayed");
    expect(e.traffic.data?.journeyMinutes).toBe(scenarios.a.traffic.data?.journeyMinutes);
  });
  it("resolves both scenarios concurrently without cross-contaminating them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const [a, b] = await Promise.all([loadScenarioEvidence(scenarios.a.scenario), loadScenarioEvidence(scenarios.b.scenario)]);
    expect(a.scenario.id).toBe("a");
    expect(b.scenario.id).toBe("b");
    expect(a.traffic.data).not.toEqual(b.traffic.data);
  });
});
