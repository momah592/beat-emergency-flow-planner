/**
 * Server-side helper used by vite.config.ts. Runs in Node only (dev/preview server),
 * never in the browser bundle, so the NTA keys cannot reach client code.
 */
export const GTFSR_UPSTREAM = "https://api.nationaltransport.ie";
export const GTFSR_AUTH_HEADER = "x-api-key";
/** Response header telling the client the server has no key configured. */
export const GTFSR_REASON_HEADER = "x-beat-gtfsr-reason";

export type GtfsrKeys = { primary?: string; secondary?: string };
export type GtfsrProxyResult = { status: number; body: string; contentType: string; reason?: "missing-key" | "upstream-unreachable" };

/** Primary key first; the secondary is tried only if the primary is rejected with 401/403. */
export async function fetchGtfsr(
  path: string,
  keys: GtfsrKeys,
  fetchImpl: typeof fetch = fetch,
): Promise<GtfsrProxyResult> {
  const candidates = [keys.primary, keys.secondary].filter((key): key is string => Boolean(key));
  if (candidates.length === 0) {
    return { status: 503, body: "NTA API key is not configured on the server", contentType: "text/plain", reason: "missing-key" };
  }

  let last: GtfsrProxyResult = { status: 502, body: "", contentType: "text/plain", reason: "upstream-unreachable" };
  for (const key of candidates) {
    try {
      const response = await fetchImpl(`${GTFSR_UPSTREAM}${path}`, {
        headers: { [GTFSR_AUTH_HEADER]: key },
        signal: AbortSignal.timeout(8000),
      });
      last = {
        status: response.status,
        body: await response.text(),
        contentType: response.headers.get("content-type") ?? "application/json",
      };
      if (response.status !== 401 && response.status !== 403) return last;
    } catch {
      return { status: 502, body: "NTA upstream unreachable", contentType: "text/plain", reason: "upstream-unreachable" };
    }
  }
  return last;
}
