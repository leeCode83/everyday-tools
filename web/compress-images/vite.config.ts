import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base so dist/ works from any static server subpath.
  base: "./",
  optimizeDeps: {
    // jSquash ships WASM glue that Vite's dep pre-bundling mangles.
    exclude: ["@jsquash/jpeg", "@jsquash/oxipng"],
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
  },
});
