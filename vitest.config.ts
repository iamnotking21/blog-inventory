import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests run outside Next, so .env.local is not picked up automatically.
    setupFiles: ["./scripts/load-env.ts"],
    // The database-backed suite talks to a real Postgres, so give it room.
    testTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
