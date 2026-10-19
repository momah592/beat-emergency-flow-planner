import type { EvidenceEnvelope, TrafficContext, TransitContext } from "../domain/types";
import { scenarios } from "./fixtures";
import { GTFSR_REASON_HEADER } from "./gtfsrProxy";
import { gtfsrFeed, sources, tripsCorridorRoutes, tripsLiveFeed } from "./sourceRegistry";

const FETCH_TIMEOUT_MS = 4000;
/** Successful feed responses are reused this long; failures only briefly, so recovery is quick. */
const CACHE_OK_MS = 60_000;
const CACHE_FAIL_MS = 10_000;

type CacheEntry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, CacheEntry>();

/**
 * Shares one request between concurrent callers and reuses the answer briefly. Scenario A and B
 * each ask for the same feed, and a public API rate-limits a page that re-fetches on every click.
 * The cached value keeps its own retrievedAt, so nothing is made to look fresher than it is.
 */
function memo<T>(key: string, fetcher: () => Promise<T>, ttlFor: (value: T) => number): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;
  const entry: CacheEntry = { expires: Number.POSITIVE_INFINITY, value: undefined as unknown as Promise<unknown> };
  entry.value = fetcher().then(
    (value) => {
      entry.expires = Date.now() + ttlFor(value);
      return value;
    },
    (error: unknown) => {
      cache.delete(key);
      throw error;
    },
  );
  cache.set(key, entry);
  return entry.value as Promise<T>;
}

/** Drops cached feed responses. Used by tests and available for a manual refresh. */
export function clearAdapterCache(): void {
  cache.clear();
}

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

type TripsFetch = { ok: true; text: string; retrievedAt: string } | { ok: false; reason: string };

async function fetchTripsCsv(): Promise<TripsFetch> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(tripsLiveFeed.proxiedPath, { signal: controller.signal });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    return { ok: true, text: await response.text(), retrievedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, reason: error instanceof Error && error.name === "AbortError" ? "timed out" : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** Live DCC TRIPS with a guaranteed fallback to the replayed fixture. Never throws. */
export async function getTrafficContext(scenarioId: "a" | "b"): Promise<EvidenceEnvelope<TrafficContext>> {
  const result = await memo("trips", fetchTripsCsv, (r) => (r.ok ? CACHE_OK_MS : CACHE_FAIL_MS));
  if (!result.ok) return fixtureFallback(scenarioId, result.reason);
  return tripsEnvelopeFromCsv(result.text, scenarioId, result.retrievedAt) ?? fixtureFallback(scenarioId, "route not found in response");
}

function transitUnavailable(retrievedAt: string, reason: string): EvidenceEnvelope<TransitContext> {
  return {
    source: sources.gtfs.name,
    sourceUrl: sources.gtfs.url,
    status: "unavailable",
    retrievedAt,
    caveat: `NTA GTFS-R unavailable: ${reason}. Transit context is not shown and is never used as a road-speed or congestion estimate.`,
  };
}

/** header.timestamp is Unix epoch seconds; protobuf JSON may render it as a numeric string. */
function epochSecondsFrom(value: unknown): number | undefined {
  const seconds = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

/**
 * Builds a live transit envelope from a GTFS-R JSON body, or undefined if the body is not a
 * GTFS-R feed. Only counts entities; it does not derive per-corridor delays or road speed.
 */
export function transitEnvelopeFromFeed(body: unknown, retrievedAt: string): EvidenceEnvelope<TransitContext> | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const feed = body as { header?: { timestamp?: unknown }; entity?: unknown };
  if (!Array.isArray(feed.entity)) return undefined;

  const entities = feed.entity as Array<Record<string, unknown> | null>;
  const tripUpdates = entities.filter((entity) => entity && (entity.trip_update ?? entity.tripUpdate)).length;
  const alerts = entities.filter((entity) => entity && entity.alert).length;

  const epoch = epochSecondsFrom(feed.header?.timestamp);
  const observedAt = epoch === undefined ? undefined : new Date(epoch * 1000).toISOString();
  const freshnessSeconds = epoch === undefined ? undefined : Math.max(0, Math.round((Date.parse(retrievedAt) - epoch * 1000) / 1000));

  const alertText = alerts === 0 ? "no service alerts published in this feed" : `${alerts} service alerts in this feed`;
  return {
    source: sources.gtfs.name,
    sourceUrl: sources.gtfs.url,
    status: "live",
    retrievedAt,
    observedAt,
    freshnessSeconds,
    caveat: `Live NTA GTFS-R: ${tripUpdates} trip updates, ${alertText}. Supporting context only; not a road-speed or congestion measure.`,
    data: { area: "NTA network-wide feed (not corridor-specific)", message: `${tripUpdates} trip updates in the feed` },
  };
}

async function fetchTransit(): Promise<EvidenceEnvelope<TransitContext>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(gtfsrFeed.proxiedPath, { signal: controller.signal });
    const retrievedAt = new Date().toISOString();
    if (response.headers.get(GTFSR_REASON_HEADER) === "missing-key") {
      return transitUnavailable(retrievedAt, "API key not configured (set NTA_API_KEY in .env.local)");
    }
    if (response.status === 429) return transitUnavailable(retrievedAt, "HTTP 429, the NTA API is rate-limiting requests; it is retried shortly");
    if (!response.ok) return transitUnavailable(retrievedAt, `HTTP ${response.status}`);
    const envelope = transitEnvelopeFromFeed(await response.json(), retrievedAt);
    return envelope ?? transitUnavailable(retrievedAt, "response was not a GTFS-R feed");
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "request timed out" : "request failed";
    return transitUnavailable(new Date().toISOString(), reason);
  } finally {
    clearTimeout(timer);
  }
}

/** Live NTA GTFS-R through the /gtfsr proxy, shared and cached briefly. Never throws; failures are "unavailable". */
export function getTransitContext(): Promise<EvidenceEnvelope<TransitContext>> {
  return memo("transit", fetchTransit, (e) => (e.status === "unavailable" ? CACHE_FAIL_MS : CACHE_OK_MS));
}
