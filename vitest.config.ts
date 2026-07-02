import { defineConfig, configDefaults } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    // Testes de integração (DB real) rodam em config separada (node env).
    exclude: [...configDefaults.exclude, "**/*.integration.test.*"],
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
});
