import type { EvidenceEnvelope, TrafficContext } from "../domain/types";
import { scenarios } from "./fixtures";
import { sources, tripsCorridorRoutes, tripsLiveFeed } from "./sourceRegistry";

const FETCH_TIMEOUT_MS = 4000;

type TripsRow = { timestamp: string; route: number; link: number; direction: number; accSeconds: number };

export function parseTripsCsv(csv: string): TripsRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",").map((cell) => cell.trim());
  if (!header) return [];
  const col = (name: string) => header.indexOf(name);
  const [iTime, iRoute, iLink, iDir, iAcc] = ["Timestamp", "Route", "Link", "Direction", "AccSTT"].map(col);
  if ([iTime, iRoute, iLink, iDir, iAcc].some((i) => i < 0)) return [];

  return lines
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .map((cells) => ({
      timestamp: cells[iTime],
      route: Number(cells[iRoute]),
      link: Number(cells[iLink]),
      direction: Number(cells[iDir]),
      accSeconds: Number(cells[iAcc]),
    }))
    .filter((row) => row.timestamp && [row.route, row.link, row.direction, row.accSeconds].every(Number.isFinite));
}

/**
 * Builds a live envelope from the newest rows for one route/direction, or returns
 * undefined if the feed does not contain that route. AccSTT accumulates along the
 * route, so the value on the highest reported link is the reported journey total.
 */
export function tripsEnvelopeFromCsv(
  csv: string,
  scenarioId: "a" | "b",
  retrievedAt: string,
): EvidenceEnvelope<TrafficContext> | undefined {
  const { route, direction } = tripsCorridorRoutes[scenarioId];
  const rows = parseTripsCsv(csv).filter((row) => row.route === route && row.direction === direction);
  if (rows.length === 0) return undefined;

  const latestTimestamp = rows.map((row) => row.timestamp).sort().at(-1)!;
  const latest = rows.filter((row) => row.timestamp === latestTimestamp);
  const lastLink = latest.reduce((max, row) => (row.link > max.link ? row : max));

  return {
    source: sources.trips.name,
    sourceUrl: sources.trips.url,
    status: "live",
    retrievedAt,
    // The feed's Timestamp (e.g. 20261004-1407) carries no timezone, so observedAt and
    // freshnessSeconds are deliberately left undefined rather than guessed.
    caveat: `Live TRIPS route ${route} direction ${direction}: accumulated travel time over ${latest.length} reported links, source timestamp ${latestTimestamp} (no timezone given). Corridor is a provisional proxy corridor.`,
    data: {
      corridor: `TRIPS route ${route} (provisional proxy corridor)`,
      direction: `Direction ${direction}`,
      journeyMinutes: Math.round((lastLink.accSeconds / 60) * 10) / 10,
    },
  };
}

function fixtureFallback(scenarioId: "a" | "b", reason: string): EvidenceEnvelope<TrafficContext> {
  const fixture = scenarios[scenarioId].traffic;
  return { ...fixture, caveat: `Live feed not used (${reason}). ${fixture.caveat}` };
}

/** Live DCC TRIPS with a guaranteed fallback to the replayed fixture. Never throws. */
export async function getTrafficContext(scenarioId: "a" | "b"): Promise<EvidenceEnvelope<TrafficContext>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(tripsLiveFeed.proxiedPath, { signal: controller.signal });
    if (!response.ok) return fixtureFallback(scenarioId, `HTTP ${response.status}`);
    const envelope = tripsEnvelopeFromCsv(await response.text(), scenarioId, new Date().toISOString());
    return envelope ?? fixtureFallback(scenarioId, "route not found in response");
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "request failed";
    return fixtureFallback(scenarioId, reason);
  } finally {
    clearTimeout(timer);
  }
}
