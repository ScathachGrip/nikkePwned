import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  root: "src",
  plugins: [
    svelte({
      onwarn: (warning, handler) => {
        if (warning.code && warning.code.startsWith("a11y")) return;
        handler(warning);
      }
    })
  ],
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
