import { describe, expect, it } from "vitest";
import { compareScenarios } from "./compareScenarios";
import { scenarios } from "../data/fixtures";

describe("compareScenarios", () => {
  it("compares declared scenarios without producing a destination recommendation", () => {
    const result = compareScenarios(scenarios.a, scenarios.b);
    expect(result.trafficLead).toBe("a");
    expect(result.trafficDeltaMinutes).toBe(5);
    expect(result.confidence).toBe("limited");
    expect(JSON.stringify(result)).not.toMatch(/recommend|dispatch|triage/i);
  });
});

