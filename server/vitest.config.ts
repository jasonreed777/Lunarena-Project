// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // Run test files one at a time to ensure proper MongoDB/auth isolation
    fileParallelism: false,
  },
});
