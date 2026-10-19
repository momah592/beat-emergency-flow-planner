import { afterEach, describe, expect, it, vi } from "vitest";
import { getPathwayTraffic, savedTripsEnvelope, tripsEnvelopeFromCsv } from "./adapters";
import { matchPath, measureCorridor, savedPathway, type LatLng } from "./tripsCorridor";

afterEach(() => vi.unstubAllGlobals());

const SJ = savedPathway("dublin2", "stjames")!;
const BEAU = savedPathway("dublin2", "beaumont")!;
const TUH = savedPathway("tallaght", "tuh")!;
const TALL_SJ = savedPathway("tallaght", "stjames")!;

/** A reading of `seconds` on every link matched to the path. */
const readingsFor = (path: LatLng[], seconds: number) => new Map(matchPath(path).links.map((l) => [l.key, seconds]));
const csvFor = (path: LatLng[], seconds: number, stamp = "20260101-1000") =>
  ["Timestamp,Route,Link,Direction,STT,AccSTT,TCS1,TCS2", ...matchPath(path).links.map((l) => { const [r, k, d] = l.key.split("-"); return `${stamp},${r},${k},${d},${seconds},${seconds},0,0`; })].join("\n");

describe("saved pathway fixtures", () => {
  it("has a non-trivial saved road route for every pathway, inside Dublin", () => {
    for (const path of [SJ, BEAU, TUH, TALL_SJ]) {
      expect(path.length).toBeGreaterThan(10);
      for (const [lat, lng] of path) {
        expect(lat).toBeGreaterThan(53.2);
        expect(lat).toBeLessThan(53.5);
        expect(lng).toBeGreaterThan(-6.5);
        expect(lng).toBeLessThan(-6.0);
      }
    }
  });
  it("returns undefined for a pathway with no saved route", () => {
    expect(savedPathway("nowhere", "tuh")).toBeUndefined();
  });
});

describe("matchPath", () => {
  it("finds TRIPS links along the city-centre pathways and none along Tallaght's local one", () => {
    expect(matchPath(SJ).links.length).toBeGreaterThan(0);
    expect(matchPath(BEAU).links.length).toBeGreaterThan(0);
    expect(matchPath(TUH).links).toHaveLength(0);
  });
  it("only matches links in the direction of travel", () => {
    const forward = new Set(matchPath(SJ).links.map((l) => l.key));
    const backward = new Set(matchPath([...SJ].reverse()).links.map((l) => l.key));
    expect(forward.size).toBeGreaterThan(0);
    for (const key of backward) expect(forward.has(key)).toBe(false);
  });
  it("is stable for the same path object and handles degenerate paths", () => {
    expect(matchPath(SJ)).toBe(matchPath(SJ));
    expect(matchPath([]).links).toEqual([]);
    expect(matchPath([[53.34, -6.26]]).links).toEqual([]);
  });
});

describe("measureCorridor", () => {
  it("computes speed, coverage and observed minutes from the matched links", () => {
    const match = matchPath(SJ);
    const m = measureCorridor(SJ, readingsFor(SJ, 36))!;
    const coveredKm = match.links.reduce((sum, l) => sum + l.km, 0);
    expect(m.matchedLinks).toBe(match.links.length);
    expect(m.coveredKm).toBeCloseTo(coveredKm, 1);
    expect(m.observedMinutes).toBeCloseTo((match.links.length * 36) / 60, 1);
    expect(m.speedKmh).toBeCloseTo(coveredKm / ((match.links.length * 36) / 3600), 0);
    expect(m.coveragePercent).toBeGreaterThan(0);
    expect(m.coveragePercent).toBeLessThanOrEqual(100);
    expect(m.routeKm).toBeCloseTo(match.routeKm, 1);
  });
  it("is faster when the same links are driven in less time", () => {
    expect(measureCorridor(SJ, readingsFor(SJ, 20))!.speedKmh).toBeGreaterThan(measureCorridor(SJ, readingsFor(SJ, 60))!.speedKmh);
  });
  it("is undefined, never estimated, when there are no usable readings", () => {
    expect(measureCorridor(SJ, new Map())).toBeUndefined();
    expect(measureCorridor(SJ, readingsFor(SJ, 0))).toBeUndefined();
    expect(measureCorridor(SJ, readingsFor(SJ, Number.NaN))).toBeUndefined();
    expect(measureCorridor(TUH, readingsFor(SJ, 36))).toBeUndefined();
  });
  it("only counts links that actually have a reading in the coverage", () => {
    const links = matchPath(SJ).links;
    const partial = new Map([[links[0].key, 30]]);
    const m = measureCorridor(SJ, partial)!;
    expect(m.matchedLinks).toBe(1);
    expect(m.coveredKm).toBeCloseTo(links[0].km, 1);
    expect(m.coveragePercent).toBeLessThan(measureCorridor(SJ, readingsFor(SJ, 30))!.coveragePercent);
  });
});

describe("pathway traffic envelopes", () => {
  it("builds a live envelope that states its coverage and is not a full journey time", () => {
    const env = tripsEnvelopeFromCsv(csvFor(SJ, 40), SJ, "2026-01-01T10:00:00Z")!;
    expect(env.status).toBe("live");
    expect(env.observedAt).toBeUndefined();
    expect(env.freshnessSeconds).toBeUndefined();
    expect(env.retrievedAt).toBe("2026-01-01T10:00:00Z");
    expect(env.caveat).toMatch(/not a full journey time/i);
    expect(env.caveat).toMatch(/% of this .* km route/);
  });
  it("returns undefined when the feed has no reading on the pathway's links", () => {
    expect(tripsEnvelopeFromCsv("Timestamp,Route,Link,Direction,STT\n20260101-1000,999,1,1,10", SJ, "R")).toBeUndefined();
    expect(tripsEnvelopeFromCsv("<html>nope</html>", SJ, "R")).toBeUndefined();
  });
  it("labels the saved snapshot as 2015 historical data, with the reason the live feed was not used", () => {
    const env = savedTripsEnvelope(SJ, "HTTP 400");
    expect(env.status).toBe("replayed");
    expect(env.observedAt).toBe("2015-11-20");
    expect(env.caveat).toContain("HTTP 400");
    expect(env.caveat).toMatch(/historical data, not current or live/i);
  });
  it("is deterministic for the same saved snapshot", () => {
    expect(savedTripsEnvelope(SJ, "x")).toEqual(savedTripsEnvelope(SJ, "x"));
  });
  it("is unavailable without fetching when no TRIPS link lies along the pathway", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const env = await getPathwayTraffic(TUH);
    expect(env.status).toBe("unavailable");
    expect(env.data).toBeUndefined();
    expect(env.caveat).toMatch(/Not estimated/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses live readings when the feed answers, and the saved snapshot when it does not", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(csvFor(SJ, 40))));
    expect((await getPathwayTraffic(SJ)).status).toBe("live");
  });
  it("falls back to the saved snapshot on HTTP 400, a timeout-like failure, or a feed without the links", async () => {
    for (const make of [
      () => vi.fn(async () => new Response("bad host", { status: 400 })),
      () => vi.fn().mockRejectedValue(new TypeError("network")),
      () => vi.fn(async () => new Response("Timestamp,Route,Link,Direction,STT\n20260101-1000,999,1,1,10")),
    ]) {
      const { clearAdapterCache } = await import("./adapters");
      clearAdapterCache();
      vi.stubGlobal("fetch", make());
      const env = await getPathwayTraffic(SJ);
      expect(env.status).toBe("replayed");
      expect(env.data?.speedKmh).toBeGreaterThan(0);
    }
  });
});
