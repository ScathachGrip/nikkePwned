import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["resources/**", "**/*.mjs", "**/*.cjs"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      quotes: ["error", "double"],
      semi: ["error", "always"],
      indent: ["error", 2],
      "no-empty": "error",
      "no-func-assign": "error",
      "no-unreachable": "error",
      "template-curly-spacing": ["error", "never"],
    },
  },
);
