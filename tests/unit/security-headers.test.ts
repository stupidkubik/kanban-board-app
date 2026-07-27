import { describe, expect, it } from "vitest"

import nextConfig from "@/next.config"

describe("security headers", () => {
  it("allows the Google API loader required by Firebase popup auth", async () => {
    const headerRules = await nextConfig.headers?.()
    const contentSecurityPolicy = headerRules
      ?.flatMap((rule) => rule.headers)
      .find((header) => header.key === "Content-Security-Policy")

    expect(contentSecurityPolicy?.value).toContain(
      "script-src 'self' 'unsafe-inline'"
    )
    expect(contentSecurityPolicy?.value).toContain("https://apis.google.com")
  })
})
