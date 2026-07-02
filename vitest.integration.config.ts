import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Testes de integração: rodam contra o SQLite real (dev.db) já populado pelo seed.
// Use `npm run test:int` (que reseta + popula antes).
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
