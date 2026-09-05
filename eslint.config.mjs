import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
    ],
  },
  ...next,
]);
