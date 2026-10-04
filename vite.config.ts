import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fetchGtfsr, GTFSR_REASON_HEADER, type GtfsrKeys } from "./src/data/gtfsrProxy";

// DCC TRIPS sends no CORS headers, so the browser fetches it through this proxy.
const proxy = {
  "/trips": {
    target: "https://opendata.dublincity.ie",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/trips/, ""),
  },
};

// NTA GTFS-R needs an API key. The key is read from .env.local here in Node and
// attached server-side; it is never exposed through `define` or import.meta.env.
function gtfsrProxy(keys: GtfsrKeys): Plugin {
  const handler = async (
    req: { url?: string; method?: string },
    res: { statusCode: number; setHeader(name: string, value: string): void; end(body?: string): void },
    next: () => void,
  ) => {
    if (!req.url?.startsWith("/gtfsr/") || req.method !== "GET") return next();
    const result = await fetchGtfsr(req.url, keys);
    res.statusCode = result.status;
    res.setHeader("content-type", result.contentType);
    if (result.reason) res.setHeader(GTFSR_REASON_HEADER, result.reason);
    res.end(result.body);
  };
  return {
    name: "healthy-traffic-gtfsr-proxy",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), gtfsrProxy({ primary: env.NTA_API_KEY, secondary: env.NTA_API_KEY_SECONDARY })],
    server: { proxy },
    preview: { proxy },
  };
});
