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

