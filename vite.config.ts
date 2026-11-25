import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  optimizeDeps: { exclude: ["maplibre-gl"] },
  worker: { format: "es" },
  build: {
    outDir: "assets/built",
    emptyOutDir: true,
    lib: {
      entry: "src/app.ts",
      formats: ["es"],
      fileName: () => "app.js",
      cssFileName: "app",
    },
    rollupOptions: { output: { assetFileNames: "[name][extname]" } },
  },
});
