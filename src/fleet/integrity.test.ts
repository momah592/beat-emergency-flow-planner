import { describe, expect, it } from "vitest";
import { scenarios } from "../data/fixtures";
import { savedPathway } from "../data/tripsCorridor";
import { AMBULANCES, HOSPITALS, INCIDENTS, DEFAULT_INCIDENT_ID, incidentById } from "./fixtures";

describe("fleet fixture integrity", () => {
  it("has unique incident, hospital and ambulance ids", () => {
    for (const ids of [INCIDENTS.map((i) => i.id), Object.keys(HOSPITALS), AMBULANCES.map((a) => a.id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it("every incident references real hospitals and a real on-scene ambulance at the scene", () => {
    for (const incident of INCIDENTS) {
      for (const id of incident.candidateHospitalIds) expect(HOSPITALS[id], `${incident.id}:${id}`).toBeDefined();
      expect(incident.candidateHospitalIds[0]).not.toBe(incident.candidateHospitalIds[1]);
      const unit = AMBULANCES.find((a) => a.id === incident.ambulanceId);
      expect(unit, incident.id).toBeDefined();
      expect(unit!.status).toBe("on scene");
      expect(unit!.position).toEqual(incident.position);
    }
  });
  it("every pathway has a saved road route, and INMO data is matched by exact hospital name", () => {
    for (const incident of INCIDENTS) {
      for (const id of incident.candidateHospitalIds) {
        expect(savedPathway(incident.id, id), `${incident.id}:${id}`).toBeDefined();
      }
    }
    expect(scenarios.a.crowding.data?.hospital).toBe(HOSPITALS.beaumont.name);
    expect(scenarios.b.crowding.data?.hospital).toBe(HOSPITALS.stjames.name);
  });
  it("uses plausible Dublin coordinates for every point", () => {
    const points = [...INCIDENTS.map((i) => i.position), ...Object.values(HOSPITALS).map((h) => h.position), ...AMBULANCES.map((a) => a.position)];
    for (const [lat, lng] of points) {
      expect(lat).toBeGreaterThan(53.2);
      expect(lat).toBeLessThan(53.5);
      expect(lng).toBeGreaterThan(-6.5);
      expect(lng).toBeLessThan(-6.0);
    }
  });
  it("defaults to St Stephen's Green and falls back to the first incident for an unknown id", () => {
    expect(DEFAULT_INCIDENT_ID).toBe("dublin2");
    expect(incidentById("nope").id).toBe("dublin2");
  });
});
