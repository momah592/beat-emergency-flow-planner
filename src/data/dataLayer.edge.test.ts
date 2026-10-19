import { afterEach, describe, expect, it, vi } from "vitest";
import { latestReadings, parseTripsCsv, transitEnvelopeFromFeed } from "./adapters";
import { incidentById } from "../fleet/fixtures";
import { buildScenarioEvidence } from "../fleet/buildEvidence";
import { dfbEnvelope, scenarios } from "./fixtures";
import { sources } from "./sourceRegistry";

afterEach(() => vi.unstubAllGlobals());

const HEADER = "Timestamp,Route,Link,Direction,STT,AccSTT,TCS1,TCS2";

describe("parseTripsCsv and latestReadings edge cases", () => {
  it("handles CRLF line endings and trailing blank lines", () => {
    const rows = parseTripsCsv(`${HEADER}\r\n20260101-1000,16,1,1,60,60,0,0\r\n\r\n`);
    expect(rows).toHaveLength(1);
    expect(rows[0].seconds).toBe(60);
  });
  it("drops rows with non-numeric fields instead of producing NaN readings", () => {
    const rows = parseTripsCsv(`${HEADER}\n20260101-1000,16,1,1,abc,60,0,0\n20260101-1000,16,2,1,60,120,0,0`);
    expect(rows).toHaveLength(1);
    expect(rows[0].link).toBe(2);
  });
  it("returns nothing when a required column is missing", () => {
    expect(parseTripsCsv("Timestamp,Route\n1,2")).toEqual([]);
    expect(parseTripsCsv("")).toEqual([]);
  });
  it("keeps the newest reading for each link and reports the newest timestamp", () => {
    const rows = parseTripsCsv([HEADER, "20260101-1000,16,1,1,60,0,0,0", "20260101-1001,16,1,1,90,0,0,0", "20260101-1000,16,2,1,30,0,0,0"].join("\n"));
    const { readings, timestamp } = latestReadings(rows);
    expect(readings.get("16-1-1")).toBe(90);
    expect(readings.get("16-2-1")).toBe(30);
    expect(timestamp).toBe("20260101-1001");
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

describe("buildScenarioEvidence end to end (offline)", () => {
  const offline = () => vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
  it("never labels INMO as ED wait time or capacity in the saved crowding evidence", () => {
    for (const id of ["a", "b"] as const) {
      const c = scenarios[id].crowding;
      expect(c.caveat).toMatch(/Not ED wait time or capacity/i);
      expect(c.status).toBe("replayed");
    }
  });
  it("keeps transit unavailable, never invented, when the proxy returns garbage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const e = await buildScenarioEvidence(incidentById("dublin2"), "beaumont", "a");
    expect(e.transit.status).toBe("unavailable");
    expect(e.traffic.status).toBe("replayed");
    expect(e.traffic.data?.speedKmh).toBe(scenarios.a.traffic.data?.speedKmh);
  });
  it("resolves both pathways concurrently without cross-contaminating them", async () => {
    offline();
    const inc = incidentById("dublin2");
    const [a, b] = await Promise.all([buildScenarioEvidence(inc, "beaumont", "a"), buildScenarioEvidence(inc, "stjames", "b")]);
    expect(a.scenario.id).toBe("a");
    expect(b.scenario.id).toBe("b");
    expect(a.traffic.data).not.toEqual(b.traffic.data);
    expect(a.crowding.data?.hospital).toBe("Beaumont Hospital");
    expect(b.crowding.data?.hospital).toBe("St James's Hospital");
  });
});
