import type { LatLng } from "./types";

/**
 * Indicative fallback geometry: a gentle arc between scene and hospital.
 *
 * Used only when real road routing is unavailable, so the two options still
 * read as distinct. It does not follow streets, and no distance or time is
 * ever derived from it.
 */
export function indicativePath(from: LatLng, to: LatLng, bend = 0.2): LatLng[] {
  const steps = 10;
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const deltaLat = toLat - fromLat;
  const deltaLng = toLng - fromLng;
  const path: LatLng[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const offset = Math.sin(t * Math.PI) * bend;
    path.push([fromLat + deltaLat * t - deltaLng * offset * 0.5, fromLng + deltaLng * t + deltaLat * offset * 0.5]);
  }

  return path;
}

/**
 * Real driving geometry from OSRM's public router, which follows actual streets.
 *
 * Geometry only. Journey times still come from DCC TRIPS: OSRM returns a
 * free-flow duration that knows nothing about observed Dublin traffic, and
 * mixing the two would misrepresent where the numbers came from.
 *
 * Returns undefined on any failure so the caller can fall back rather than
 * showing nothing.
 */
export async function fetchRoadRoute(from: LatLng, to: LatLng, timeoutMs = 5000): Promise<LatLng[] | undefined> {
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return undefined;

    const body: unknown = await response.json();
    const line = (body as { routes?: { geometry?: { coordinates?: unknown } }[] })?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(line) || line.length === 0) return undefined;

    // OSRM returns [lng, lat]; Leaflet wants [lat, lng].
    return line.map((point) => [(point as number[])[1], (point as number[])[0]] as LatLng);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
