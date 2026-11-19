import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFileSync } from "node:fs";

// The version shown in the window's footer and on About (0.25.0): package.json's, which a test keeps equal to the host's.
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

export default defineConfig({
  plugins: [svelte()],
  define: { __COMPANION_VERSION__: JSON.stringify(version) },
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
