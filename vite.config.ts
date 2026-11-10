import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  test: {
    exclude: [
      "tests/accessibility/**",
      "node_modules/**",
      "dist/**",
      "external/**",
    ],
  },
  clearScreen: false,
  build: {
    // ECharts is one file of about 560 kB (190 kB compressed), loaded only when a report has a chart, from this PC.
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
});
