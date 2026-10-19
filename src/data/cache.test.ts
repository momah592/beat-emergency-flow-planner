import { afterEach, describe, expect, it, vi } from "vitest";
import { getPathwayTraffic, getTransitContext } from "./adapters";
import { savedPathway } from "./tripsCorridor";
import { buildScenarioEvidence } from "../fleet/buildEvidence";
import { incidentById } from "../fleet/fixtures";
import { inmoEnvelopeFor } from "./fixtures";
import tripsCsv from "../../fixtures/trips-2015-sample.csv?raw";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const feed = { header: { timestamp: 1790000000 }, entity: [{ trip_update: {} }] };

describe("request sharing and caching", () => {
  it("fetches the transit feed once for both scenarios, not once each", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(feed)));
    vi.stubGlobal("fetch", fetchMock);
    const inc = incidentById("dublin2");
    await Promise.all([buildScenarioEvidence(inc, "beaumont", "a"), buildScenarioEvidence(inc, "stjames", "b")]);
    const transitCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/gtfsr/"));
    const tripsCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/trips/"));
    expect(transitCalls).toHaveLength(1);
    expect(tripsCalls).toHaveLength(1);
  });

  it("reuses a good answer for a minute, then fetches again", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response(tripsCsv));
    vi.stubGlobal("fetch", fetchMock);
    const path = savedPathway("dublin2", "stjames")!;
    await getPathwayTraffic(path);
    await getPathwayTraffic(savedPathway("dublin2", "beaumont")!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(61_000);
    await getPathwayTraffic(path);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a failed feed within seconds, not a minute", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await getTransitContext();
    await getTransitContext();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(11_000);
    await getTransitContext();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the original retrievedAt on a cached answer instead of looking fresher", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(feed))));
    const first = await getTransitContext();
    await vi.advanceTimersByTimeAsync(30_000);
    const second = await getTransitContext();
    expect(second.retrievedAt).toBe(first.retrievedAt);
  });

  it("explains a rate limit plainly and still reports unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    const e = await getTransitContext();
    expect(e.status).toBe("unavailable");
    expect(e.caveat).toMatch(/429.*rate-limiting/);
  });
});

describe("INMO snapshot lookup", () => {
  it("returns the saved figure for a captured hospital as trolley plus ward", () => {
    const e = inmoEnvelopeFor("Beaumont Hospital");
    expect(e.status).toBe("replayed");
    expect(e.data?.patientsWaitingForBeds).toBe(37);
    expect(e.caveat).toMatch(/Not ED wait time or capacity/);
  });
  it("is unavailable, never estimated, for a hospital that was not captured", () => {
    const e = inmoEnvelopeFor("Tallaght University Hospital");
    expect(e.status).toBe("unavailable");
    expect(e.data).toBeUndefined();
    expect(e.caveat).toMatch(/Not estimated/);
  });
  it("matches the hospital name exactly, so a lookalike gets nothing", () => {
    expect(inmoEnvelopeFor("beaumont hospital").status).toBe("unavailable");
    expect(inmoEnvelopeFor("").status).toBe("unavailable");
  });
});
