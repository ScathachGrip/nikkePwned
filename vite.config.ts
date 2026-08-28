import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  root: "src",
  plugins: [svelte()],
  base: "./",
  publicDir: "../resources",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
  },
});
