export const sources = {
  trips: {
    name: "DCC TRIPS",
    url: "https://data.smartdublin.ie/en/dataset/journey-times-across-dublin-city-from-dublin-city-council-traffic-departments-trips-system",
  },
  gtfs: {
    name: "NTA GTFS Realtime",
    url: "https://data.gov.ie/dataset/nta-gtfs/resource/53190120-1aa2-4127-acff-e5645acff08b",
  },
  dfb: {
    name: "Dublin Fire Brigade incidents",
    url: "https://data.gov.ie/dataset/fire-brigade-and-ambulance/resource/032ddfd7-3af8-49d1-9305-3e874b212782",
  },
  inmo: {
    name: "INMO Trolley Watch",
    url: "https://www.inmo.ie/News-Campaigns/Trolley-Watch",
  },
} as const;

/**
 * Live TRIPS feed (updated every minute per the dataset notes). Fetched through
 * the Vite proxy at /trips (see vite.config.ts) because the host sends no CORS headers.
 * Columns: Timestamp,Route,Link,Direction,STT,AccSTT,TCS1,TCS2 (STT/AccSTT in seconds).
 */
export const tripsLiveFeed = {
  upstream: "https://opendata.dublincity.ie/TrafficOpenData/CP_TR/trips.csv",
  proxiedPath: "/trips/TrafficOpenData/CP_TR/trips.csv",
} as const;

/** Saved snapshot behind the replayed traffic fixture (fixtures/trips-2015-sample.csv). */
export const tripsSample = {
  label: "2015 sample, saved snapshot",
  proxyLabel: "provisional proxy corridor",
  file: "fixtures/trips-2015-sample.csv",
  rawTimestamp: "20151120-1606",
  observedDate: "2015-11-20",
} as const;

/**
 * Which TRIPS route/direction stands in for each declared corridor.
 * Provisional proxy corridor: chosen from routes.csv geometry (route 16 dir 1 starts ~0.7 km from
 * St Stephen's Green and runs north; route 37 dir 1 starts ~0.9 km away and runs west).
 * The team should confirm these before quoting them.
 */
export const tripsCorridorRoutes: Record<"a" | "b", { route: number; direction: number }> = {
  a: { route: 16, direction: 1 },
  b: { route: 37, direction: 1 },
};
