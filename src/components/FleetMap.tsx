import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ComparisonResult } from "../domain/types";
import { AMBULANCES, HOSPITALS, ambulanceById } from "../fleet/fixtures";
import { fetchRoadRoute, indicativePath } from "../fleet/routeGeometry";
import type { Incident, LatLng } from "../fleet/types";

type Geometry = { path: LatLng[]; routed: boolean };

const PATH_COLOUR = { a: "#2398c5", b: "#7a5ac8" } as const;

type Props = { incident: Incident; result: ComparisonResult };

/**
 * Fleet view: the scene, simulated units and both declared pathways. Both are drawn with equal
 * weight so the map never implies a choice. Colours identify Scenario A and B only.
 */
/**
 * Places a hospital label on the far side of its own point, away from the
 * scene, so labels do not stack on top of each other at city-centre zoom.
 */
function sideClass(scene: [number, number], hospital: [number, number]): string {
  const vertical = hospital[0] >= scene[0] ? "n" : "s";
  const horizontal = hospital[1] < scene[1] ? "w" : "e";
  return `pin-${vertical}${horizontal}`;
}

export function FleetMap({ incident, result }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [geometry, setGeometry] = useState<Record<string, Geometry>>({});

  // Draw indicative arcs immediately, then upgrade to real road geometry when
  // the router answers. If it does not, the arcs stay and the caption says so.
  useEffect(() => {
    let active = true;
    const ids = incident.candidateHospitalIds;

    setGeometry(
      Object.fromEntries(
        ids.map((id, index) => [
          id,
          { path: indicativePath(incident.position, HOSPITALS[id].position, index === 0 ? 0.2 : -0.2), routed: false },
        ]),
      ),
    );

    Promise.all(
      ids.map(async (id) => [id, await fetchRoadRoute(incident.position, HOSPITALS[id].position)] as const),
    ).then((results) => {
      if (!active) return;
      setGeometry((previous) => {
        const next = { ...previous };
        for (const [id, path] of results) {
          if (path) next[id] = { path, routed: true };
        }
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [incident]);

  useEffect(() => {
    const element = container.current;
    if (!element || map.current) return;

    const instance = L.map(element, { scrollWheelZoom: false }).setView([53.3485, -6.265], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(instance);
    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const element = container.current;
    const instance = map.current;
    if (!element || !instance) return;

    const drawn: L.Layer[] = [];
    const onScene = ambulanceById(incident.ambulanceId);

    // Idle units are dots with hover labels: permanent labels for every unit
    // collide with the hospital and scene pins at city-centre zoom.
    for (const ambulance of AMBULANCES) {
      if (ambulance.id === incident.ambulanceId) continue;
      drawn.push(
        L.circleMarker(ambulance.position, {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#54708a",
          fillOpacity: 1,
        })
          .bindTooltip(`${ambulance.callsign} · available`, { direction: "top", offset: [0, -8] })
          .addTo(instance),
      );
    }

    const [a, b] = result.scenarios;
    const slots: { slot: "a" | "b"; hospitalId: string; minutes?: number; waiting?: number }[] = [
      {
        slot: "a",
        hospitalId: incident.candidateHospitalIds[0],
        minutes: a.traffic.data?.journeyMinutes,
        waiting: a.crowding.data?.patientsWaitingForBeds,
      },
      {
        slot: "b",
        hospitalId: incident.candidateHospitalIds[1],
        minutes: b.traffic.data?.journeyMinutes,
        waiting: b.crowding.data?.patientsWaitingForBeds,
      },
    ];

    for (const { slot, hospitalId, minutes, waiting } of slots) {
      const hospital = HOSPITALS[hospitalId];

      const path =
        geometry[hospitalId]?.path ?? indicativePath(incident.position, hospital.position, slot === "a" ? 0.2 : -0.2);
      const weight = 5;

      // White casing underneath, so both runs stay legible over busy map tiles.
      drawn.push(L.polyline(path, { color: "#ffffff", weight: weight + 5, opacity: 0.85 }).addTo(instance));
      drawn.push(
        L.polyline(path, {
          color: PATH_COLOUR[slot],
          weight,
          opacity: 0.9,
          dashArray: minutes === undefined ? "6 8" : undefined,
        }).addTo(instance),
      );

      drawn.push(
        L.marker(hospital.position, {
          icon: L.divIcon({
            className: "map-pin",
            html: `<span class="pin pin-hospital ${sideClass(incident.position, hospital.position)} ">${hospital.shortName}<em>${minutes === undefined ? "no observed data" : `${minutes} min${waiting === undefined ? "" : ` · ${waiting} waiting for beds`}`}</em></span>`,
            iconSize: [0, 0],
          }),
        }).addTo(instance),
      );
    }

    drawn.push(
      L.marker(incident.position, {
        icon: L.divIcon({
          className: "map-pin",
          html: `<span class="pin pin-scene">${incident.label}<em>${onScene ? `${onScene.callsign} (simulated)` : "no unit assigned"}</em></span>`,
          iconSize: [0, 0],
        }),
      }).addTo(instance),
    );

    const bounds = L.latLngBounds([
      incident.position,
      ...incident.candidateHospitalIds.map((id) => HOSPITALS[id].position),
      ...(onScene ? [onScene.position] : []),
    ]);

    // The container can report zero width on first paint because the stylesheet
    // is injected asynchronously; fitting then snaps to maximum zoom.
    let fitted = false;
    const fit = () => {
      if (fitted || element.clientWidth === 0 || element.clientHeight === 0) return;
      fitted = true;
      instance.invalidateSize();
      instance.fitBounds(bounds, { padding: [50, 50] });
      observer.disconnect();
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();

    return () => {
      observer.disconnect();
      for (const layer of drawn) instance.removeLayer(layer);
    };
  }, [incident, result, geometry]);

  const paths = Object.values(geometry);
  const allRouted = paths.length > 0 && paths.every((item) => item.routed);

  return (
    <>
      <div className="map" ref={container} />
      <p className="small route-source">
        {allRouted
          ? "Route geometry: live road routing from OSRM, following actual streets. Journey times come from DCC TRIPS, not from this geometry."
          : "Route geometry: indicative only. The road router did not answer, so these lines do not follow streets. Journey times come from DCC TRIPS and are unaffected."}
      </p>
    </>
  );
}
