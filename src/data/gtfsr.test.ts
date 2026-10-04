import { afterEach, describe, expect, it, vi } from "vitest";
import { getTransitContext, transitEnvelopeFromFeed } from "./adapters";
import { fetchGtfsr, GTFSR_REASON_HEADER } from "./gtfsrProxy";

const SAMPLE_FEED = {
  header: { gtfs_realtime_version: "2.0", timestamp: "1790000000" },
  entity: [
    { id: "1", trip_update: { trip: { trip_id: "t1" } } },
    { id: "2", trip_update: { trip: { trip_id: "t2" } } },
    { id: "3", trip_update: { trip: { trip_id: "t3" } } },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GTFS-R feed parsing", () => {
  it("counts trip updates and writes the agreed caveat", () => {
    const envelope = transitEnvelopeFromFeed(SAMPLE_FEED, "2026-10-04T14:20:00Z")!;
    expect(envelope.status).toBe("live");
    expect(envelope.caveat).toBe(
      "Live NTA GTFS-R: 3 trip updates, no service alerts published in this feed. Supporting context only; not a road-speed or congestion measure.",
    );
  });

  it("converts the epoch-seconds header to observedAt and freshnessSeconds", () => {
    const observed = Date.UTC(2026, 9, 4, 14, 19, 30) / 1000;
    const envelope = transitEnvelopeFromFeed({ ...SAMPLE_FEED, header: { timestamp: observed } }, "2026-10-04T14:20:00Z")!;
    expect(envelope.observedAt).toBe("2026-10-04T14:19:30.000Z");
    expect(envelope.freshnessSeconds).toBe(30);
  });

  it("leaves observedAt and freshnessSeconds undefined when the header has no timestamp", () => {
    const envelope = transitEnvelopeFromFeed({ header: {}, entity: SAMPLE_FEED.entity }, "2026-10-04T14:20:00Z")!;
    expect(envelope.observedAt).toBeUndefined();
    expect(envelope.freshnessSeconds).toBeUndefined();
  });

  it("rejects a body that is not a feed", () => {
    expect(transitEnvelopeFromFeed({ nope: true }, "R")).toBeUndefined();
    expect(transitEnvelopeFromFeed(null, "R")).toBeUndefined();
  });
});

describe("getTransitContext", () => {
  it("returns live transit from the proxied feed", async () => {
    vi.stubGlobal("fetch", async () => Response.json(SAMPLE_FEED));
    const envelope = await getTransitContext();
    expect(envelope.status).toBe("live");
    expect(envelope.observedAt).toBe(new Date(1790000000 * 1000).toISOString());
  });

  it("is unavailable when the server has no key configured", async () => {
    vi.stubGlobal("fetch", async () => new Response("no key", { status: 503, headers: { [GTFSR_REASON_HEADER]: "missing-key" } }));
    const envelope = await getTransitContext();
    expect(envelope.status).toBe("unavailable");
    expect(envelope.caveat).toContain("API key not configured");
    expect(envelope.data).toBeUndefined();
    expect(envelope.observedAt).toBeUndefined();
  });

  it("is unavailable on a bad response", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>", { status: 200 }));
    const envelope = await getTransitContext();
    expect(envelope.status).toBe("unavailable");
  });

  it("is unavailable on timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const pending = getTransitContext();
    await vi.advanceTimersByTimeAsync(5000);
    const envelope = await pending;
    expect(envelope.status).toBe("unavailable");
    expect(envelope.caveat).toContain("timed out");
  });
});

describe("fetchGtfsr (server-side proxy helper)", () => {
  it("reports a missing key without calling upstream", async () => {
    const fetchImpl = vi.fn();
    const result = await fetchGtfsr("/gtfsr/v2/gtfsr?format=json", {}, fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe(503);
    expect(result.reason).toBe("missing-key");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("retries with the secondary key after a 401", async () => {
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const key = (init.headers as Record<string, string>)["x-api-key"];
      seen.push(key);
      return key === "primary-test" ? new Response("denied", { status: 401 }) : new Response("{}", { status: 200 });
    });
    const result = await fetchGtfsr("/gtfsr/v2/gtfsr?format=json", { primary: "primary-test", secondary: "secondary-test" }, fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe(200);
    expect(seen).toEqual(["primary-test", "secondary-test"]);
  });

  it("does not use the secondary key when the primary succeeds", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await fetchGtfsr("/gtfsr/v2/gtfsr?format=json", { primary: "p", secondary: "s" }, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns the 401 when both keys are rejected", async () => {
    const fetchImpl = vi.fn(async () => new Response("denied", { status: 401 }));
    const result = await fetchGtfsr("/x", { primary: "p", secondary: "s" }, fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
