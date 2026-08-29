import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    warningFilter: (warning) => !warning.code.startsWith("a11y"),
  },
  onwarn: (warning, handler) => {
    if (warning.code && warning.code.startsWith("a11y")) return;
    handler(warning);
  },
};
