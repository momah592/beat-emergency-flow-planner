import linkFixtures from "../../fixtures/trips-links.json";
import pathwayFixtures from "../../fixtures/pathways.json";

/**
 * Corridor measure: which DCC TRIPS links lie along a pathway's road route, and what TRIPS observed on them.
 *
 * TRIPS only covers part of the network, so this never claims a full journey time. It reports the
 * observed speed on the links that are covered, and how much of the route that is.
 */

export type LatLng = [number, number];

type TripsLink = { route: number; link: number; direction: number; points: LatLng[] };

const links = linkFixtures as unknown as TripsLink[];
const pathways = pathwayFixtures as unknown as Record<string, LatLng[]>;

/** A link counts as "on the path" when every vertex is within this distance of it. */
const MATCH_METRES = 40;
const EARTH_M = 6_371_000;

export const linkKey = (route: number, link: number, direction: number) => `${route}-${link}-${direction}`;

/** Saved road route for an incident -> hospital pathway (fixtures/pathways.json). */
export function savedPathway(incidentId: string, hospitalId: string): LatLng[] | undefined {
  return pathways[`${incidentId}:${hospitalId}`];
}

const metresPerDegLat = 110_540;
const metresPerDegLng = (lat: number) => Math.cos((lat * Math.PI) / 180) * 111_320;

function lengthMetres(points: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[i + 1];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    total += 2 * EARTH_M * Math.asin(Math.sqrt(h));
  }
  return total;
}

/** Distance in metres from a point to a polyline, and the index of the nearest segment. */
function nearest(point: LatLng, path: LatLng[]): { metres: number; segment: number } {
  const kx = metresPerDegLng(point[0]);
  let best = Number.POSITIVE_INFINITY;
  let segment = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const ax = (path[i][1] - point[1]) * kx;
    const ay = (path[i][0] - point[0]) * metresPerDegLat;
    const bx = (path[i + 1][1] - point[1]) * kx;
    const by = (path[i + 1][0] - point[0]) * metresPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) {
      best = d;
      segment = i;
    }
  }
  return { metres: best, segment };
}

export type PathMatch = {
  routeKm: number;
  links: { key: string; route: number; km: number }[];
};

const matches = new WeakMap<LatLng[], PathMatch>();

/** TRIPS links that run along the path, in the direction of travel. Independent of any reading. */
export function matchPath(path: LatLng[]): PathMatch {
  const cached = matches.get(path);
  if (cached) return cached;
  const found: PathMatch["links"] = [];
  if (path.length >= 2) {
    for (const link of links) {
      const along = link.points.map((point) => nearest(point, path));
      if (along.some((n) => n.metres > MATCH_METRES)) continue;
      if (along[along.length - 1].segment < along[0].segment) continue; // runs against the direction of travel
      found.push({ key: linkKey(link.route, link.link, link.direction), route: link.route, km: lengthMetres(link.points) / 1000 });
    }
  }
  const result = { routeKm: lengthMetres(path) / 1000, links: found };
  matches.set(path, result);
  return result;
}

export type CorridorMeasure = {
  matchedLinks: number;
  coveredKm: number;
  routeKm: number;
  coveragePercent: number;
  observedMinutes: number;
  speedKmh: number;
  routes: number[];
};

/**
 * Observed speed on the matched links that have a reading. `readings` maps a link key to its
 * segment travel time in seconds. Returns undefined when no matched link has a usable reading.
 */
export function measureCorridor(path: LatLng[], readings: Map<string, number>): CorridorMeasure | undefined {
  const match = matchPath(path);
  const used = match.links.filter((link) => {
    const seconds = readings.get(link.key);
    return seconds !== undefined && Number.isFinite(seconds) && seconds > 0 && link.km > 0;
  });
  if (used.length === 0 || match.routeKm <= 0) return undefined;

  const coveredKm = used.reduce((sum, link) => sum + link.km, 0);
  const seconds = used.reduce((sum, link) => sum + (readings.get(link.key) ?? 0), 0);
  return {
    matchedLinks: used.length,
    coveredKm: round(coveredKm, 2),
    routeKm: round(match.routeKm, 1),
    coveragePercent: Math.round((coveredKm / match.routeKm) * 100),
    observedMinutes: round(seconds / 60, 1),
    speedKmh: round(coveredKm / (seconds / 3600), 1),
    routes: [...new Set(used.map((link) => link.route))].sort((a, b) => a - b),
  };
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;
