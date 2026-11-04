import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

const alias = { "@": path.resolve(import.meta.dirname, ".") }

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["app/**", "components/**", "features/**", "lib/**"],
      exclude: [...(configDefaults.coverage.exclude ?? []), "**/*.module.css"],
      reporter: ["text-summary", "html"],
      // Ratchet: set just below the measured baseline; raise as tests are added.
      // Baseline 2026-11-04: statements 46.0, branches 38.4, functions 47.3, lines 45.8.
      thresholds: {
        statements: 45,
        branches: 38,
        functions: 47,
        lines: 45,
      },
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "unit",
          include: [
            "tests/unit/**/*.test.{ts,tsx}",
            "tests/components/**/*.test.{ts,tsx}",
          ],
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          css: true,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "rules",
          include: ["tests/firestore/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
})
