import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_INCIDENT_ID, HOSPITALS, incidentById } from "./fixtures";
import { buildScenarioEvidence } from "./buildEvidence";

afterEach(() => vi.unstubAllGlobals());

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

  it("returns unavailable evidence for a hospital with no data slot", async () => {
    offline();
    const x = await buildScenarioEvidence(incidentById("docklands"), "mater", "a");
    expect(x.traffic.status).toBe("unavailable");
    expect(x.crowding.status).toBe("unavailable");
  });
});
