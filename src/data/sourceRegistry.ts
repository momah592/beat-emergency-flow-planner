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

/**
 * NTA GTFS-Realtime v2 (JSON). Fetched through the /gtfsr proxy in vite.config.ts, which
 * adds the x-api-key header server-side. header.timestamp is Unix epoch seconds; the feed
 * carries trip_update entities and publishes no service alerts.
 */
export const gtfsrFeed = {
  upstream: "https://api.nationaltransport.ie/gtfsr/v2/gtfsr?format=json",
  proxiedPath: "/gtfsr/v2/gtfsr?format=json",
} as const;

/** Saved snapshot behind the replayed traffic fixture (fixtures/trips-2015-sample.csv). */
/** When the saved TRIPS snapshot was captured. */
export const tripsSampleSavedAt = "2026-10-04T13:23:00Z";

export const tripsSample = {
  label: "2015 sample, saved snapshot",
  file: "fixtures/trips-2015-sample.csv",
  rawTimestamp: "20151120-1606",
  observedDate: "2015-11-20",
} as const;
