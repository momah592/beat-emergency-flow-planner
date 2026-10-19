import { describe, expect, it } from "vitest";
import type { EvidenceEnvelope } from "../domain/types";
import { freshnessLabel, statusLabel } from "./freshness";
import { formatTimestamp } from "./formatTime";

const env = (over: Partial<EvidenceEnvelope<unknown>>): EvidenceEnvelope<unknown> => ({
  source: "S", sourceUrl: "u", status: "live", retrievedAt: "2026-10-19T10:00:00Z", caveat: "c", ...over,
});

describe("freshnessLabel", () => {
  it("says unavailable for unavailable evidence", () => {
    expect(freshnessLabel(env({ status: "unavailable" }))).toBe("Unavailable");
  });
  it("calls a replayed reading a saved snapshot and shows its observed date", () => {
    expect(freshnessLabel(env({ status: "replayed", observedAt: "2015-11-20" }))).toMatch(/^Saved snapshot from .*2015/);
  });
  it("does not claim a time for a replayed reading without one", () => {
    expect(freshnessLabel(env({ status: "replayed" }))).toMatch(/observation time not supplied/);
  });
  it("shows live freshness seconds when supplied, including zero", () => {
    expect(freshnessLabel(env({ freshnessSeconds: 45 }))).toBe("Live, observed 45s before retrieval");
    expect(freshnessLabel(env({ freshnessSeconds: 0 }))).toBe("Live, observed 0s before retrieval");
  });
  it("never implies recency for live data with no observation time", () => {
    expect(freshnessLabel(env({}))).toBe("Live, observation time not supplied");
  });
});

describe("statusLabel and formatTimestamp", () => {
  it("renames replayed to saved snapshot and leaves the others", () => {
    expect(statusLabel("replayed")).toBe("saved snapshot");
    expect(statusLabel("live")).toBe("live");
    expect(statusLabel("unavailable")).toBe("unavailable");
  });
  it("returns an explicit absence rather than a made-up time", () => {
    expect(formatTimestamp(undefined)).toBe("Not supplied");
    expect(formatTimestamp("not a date")).toBe("Not supplied");
  });
});
