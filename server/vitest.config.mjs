import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: "./tests/setup.ts",
    env: {
      BETTER_AUTH_URL: "http://localhost:8000",
    },
  },
});
