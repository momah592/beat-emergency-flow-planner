import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DCC TRIPS sends no CORS headers, so the browser fetches it through this proxy.
const proxy = {
  "/trips": {
    target: "https://opendata.dublincity.ie",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/trips/, ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
