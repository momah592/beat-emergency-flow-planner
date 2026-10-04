import { afterEach, describe, expect, it, vi } from "vitest";
import tripsCsv from "../../fixtures/trips-2015-sample.csv?raw";
import { getTrafficContext, tripsEnvelopeFromCsv } from "./adapters";
import { scenarios } from "./fixtures";
import { loadScenarioEvidence } from "./loadScenarioEvidence";
import type { Scenario } from "../domain/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("TRIPS CSV parsing", () => {
  it("builds a live envelope from the real sample without inventing time fields", () => {
    const a = tripsEnvelopeFromCsv(tripsCsv, "a", "R")!;
    const b = tripsEnvelopeFromCsv(tripsCsv, "b", "R")!;
    expect(a.status).toBe("live");
    expect(a.data?.journeyMinutes).toBe(2.4);
    expect(b.data?.journeyMinutes).toBe(18.3);
    expect(a.observedAt).toBeUndefined();
    expect(a.freshnessSeconds).toBeUndefined();
    expect(a.caveat).toContain("20151120-1606");
    expect(a.caveat).toContain("provisional proxy corridor");
  });

  it("returns undefined when the route is missing", () => {
    expect(tripsEnvelopeFromCsv("Timestamp,Route,Link,Direction,STT,AccSTT\n", "a", "R")).toBeUndefined();
  });

  it("returns undefined for a non-CSV body", () => {
    expect(tripsEnvelopeFromCsv("<html>nope</html>", "a", "R")).toBeUndefined();
  });
});

describe("replayed fixture", () => {
  it("matches the saved CSV and is labelled as a 2015 snapshot", () => {
    for (const id of ["a", "b"] as const) {
      const fixture = scenarios[id].traffic;
      const fromCsv = tripsEnvelopeFromCsv(tripsCsv, id, "R")!;
      expect(fixture.status).toBe("replayed");
      expect(fixture.data?.journeyMinutes).toBe(fromCsv.data?.journeyMinutes);
      expect(fixture.observedAt).toBe("2015-11-20");
      expect(fixture.freshnessSeconds).toBeUndefined();
      expect(fixture.caveat).toContain("2015 sample, saved snapshot");
      expect(fixture.caveat).toContain("provisional proxy corridor");
    }
  });
});

describe("getTrafficContext fallbacks", () => {
  it("falls back to the replayed fixture when fetch rejects", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("network")));
    const envelope = await getTrafficContext("a");
    expect(envelope.status).toBe("replayed");
    expect(envelope.data).toEqual(scenarios.a.traffic.data);
  });

  it("falls back on HTTP 400", async () => {
    vi.stubGlobal("fetch", async () => new Response("bad host", { status: 400 }));
    const envelope = await getTrafficContext("b");
    expect(envelope.status).toBe("replayed");
    expect(envelope.caveat).toContain("HTTP 400");
  });

  it("falls back when the request hangs", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const pending = getTrafficContext("a");
    await vi.advanceTimersByTimeAsync(5000);
    const envelope = await pending;
    expect(envelope.status).toBe("replayed");
    expect(envelope.caveat).toContain("timed out");
  });

  it("falls back when the route is missing from the response", async () => {
    vi.stubGlobal("fetch", async () => new Response("Timestamp,Route,Link,Direction,STT,AccSTT\n20260101-1200,99,1,1,10,10\n"));
    const envelope = await getTrafficContext("a");
    expect(envelope.status).toBe("replayed");
    expect(envelope.caveat).toContain("route not found");
  });
});

describe("loadScenarioEvidence", () => {
  it("returns live traffic on the happy path", async () => {
    vi.stubGlobal("fetch", async () => new Response(tripsCsv));
    const evidence = await loadScenarioEvidence(scenarios.a.scenario);
    expect(evidence.scenario.id).toBe("a");
    expect(evidence.traffic.status).toBe("live");
    expect(evidence.traffic.data?.journeyMinutes).toBe(2.4);
    expect(evidence.crowding).toEqual(scenarios.a.crowding);
    expect(evidence.transit.status).toBe("unavailable");
  });

  it("does not throw when fetch throws synchronously", async () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("boom");
    });
    const evidence = await loadScenarioEvidence(scenarios.b.scenario);
    expect(evidence.traffic.status).toBe("replayed");
    expect(evidence.transit.status).toBe("unavailable");
  });

  it("returns unavailable envelopes for an unknown scenario id", async () => {
    const evidence = await loadScenarioEvidence({ id: "z", name: "Z", declaredCorridor: "x", namedHospital: "y" } as unknown as Scenario);
    for (const layer of [evidence.traffic, evidence.crowding, evidence.transit]) {
      expect(layer.status).toBe("unavailable");
      expect(layer.data).toBeUndefined();
      expect(layer.observedAt).toBeUndefined();
    }
  });
});
