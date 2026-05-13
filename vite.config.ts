import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: "manifest.json",
      browser: "chrome",
      additionalInputs: ["src/onboarding/index.html"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "chrome120",
    sourcemap: "inline",
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Stable chunk names so MV3 doesn't reject the bundle on update.
        chunkFileNames: "assets/chunk-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
