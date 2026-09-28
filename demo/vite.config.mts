import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Baut eine eigenständige Gast-Demo (ohne Login und Server) aus denselben Spiel-Komponenten.
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
      // "use client" ist nur für Next.js relevant, im Demo-Bundle bedeutungslos
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
});
