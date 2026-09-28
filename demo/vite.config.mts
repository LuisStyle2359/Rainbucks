import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Builds a standalone guest demo (no login, no server) from the same game components.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  },
  oxc: { jsx: { runtime: "automatic" } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    chunkSizeWarningLimit: 1_000,
    rolldownOptions: {
      output: { entryFileNames: "app.js", assetFileNames: "app.[ext]" },
      // "use client" only matters for Next.js; it means nothing in the demo bundle
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
});
