import { defineConfig } from "cypress"

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: "http://localhost:3000",
    defaultCommandTimeout: 15_000,
    pageLoadTimeout: 120_000,
    requestTimeout: 20_000,
    responseTimeout: 20_000,
    supportFile: "cypress/support/e2e.ts",
  },
  video: false,
})
