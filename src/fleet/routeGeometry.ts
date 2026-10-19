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
