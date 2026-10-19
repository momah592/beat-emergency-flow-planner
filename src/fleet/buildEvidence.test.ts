import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_INCIDENT_ID, HOSPITALS, incidentById } from "./fixtures";
import type { Hospital } from "./types";
import { buildScenarioEvidence } from "./buildEvidence";

// A hospital with no mapped TRIPS corridor, used to exercise the "no data slot" path.
const UNMAPPED: Hospital = { id: "unmapped", name: "Unmapped Test Hospital", shortName: "Unmapped", position: [53.34, -6.26] };

afterEach(() => {
  vi.unstubAllGlobals();
  delete HOSPITALS[UNMAPPED.id];
});

describe("buildScenarioEvidence", () => {
  const offline = () => vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

  it("defaults to the Tallaght scene with declared nearest and flow-aware pathways", async () => {
    offline();
    const incident = incidentById(DEFAULT_INCIDENT_ID);
    expect(incident.id).toBe("tallaght");
    const a = await buildScenarioEvidence(incident, incident.candidateHospitalIds[0], "a");
    const b = await buildScenarioEvidence(incident, incident.candidateHospitalIds[1], "b");
    expect(a.scenario.name).toMatch(/nearest-hospital pathway/i);
    expect(b.scenario.name).toMatch(/flow-aware pathway/i);
  });

  it("never shows another hospital's trolley count against Tallaght University Hospital", async () => {
    offline();
    const incident = incidentById("tallaght");
    const a = await buildScenarioEvidence(incident, "tuh", "a");
    expect(a.crowding.status).toBe("unavailable");
    expect(a.crowding.data).toBeUndefined();
    expect(a.crowding.caveat).toContain(HOSPITALS.tuh.name);
  });

  it("keeps a published figure for the hospital it was published for", async () => {
    offline();
    const b = await buildScenarioEvidence(incidentById("tallaght"), "stjames", "b");
    expect(b.crowding.data?.hospital).toBe("St James's Hospital");
  });

  it("flags the saved corridor as a stand-in on the Tallaght scene", async () => {
    offline();
    const a = await buildScenarioEvidence(incidentById("tallaght"), "tuh", "a");
    expect(a.traffic.caveat).toMatch(/not measured on a Tallaght route/i);
    expect(a.traffic.status).toBe("replayed");
  });

  it("still uses the network-wide transit feed for a hospital with no mapped corridor", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      String(url).includes("/gtfsr/") ? new Response(JSON.stringify({ header: { timestamp: 1790000000 }, entity: [{ trip_update: {} }] })) : Promise.reject(new Error("down"))));
    HOSPITALS[UNMAPPED.id] = UNMAPPED;
    const x = await buildScenarioEvidence(incidentById("tallaght"), UNMAPPED.id, "a");
    expect(x.transit.status).toBe("live");
    expect(x.traffic.status).toBe("unavailable");
  });

  it("returns unavailable evidence for a hospital with no data slot", async () => {
    offline();
    HOSPITALS[UNMAPPED.id] = UNMAPPED;
    const x = await buildScenarioEvidence(incidentById("tallaght"), UNMAPPED.id, "a");
    expect(x.traffic.status).toBe("unavailable");
    expect(x.crowding.status).toBe("unavailable");
  });
});
