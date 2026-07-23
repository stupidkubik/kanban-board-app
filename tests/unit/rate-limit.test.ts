import { describe, expect, it } from "vitest"

import { createFixedWindowRateLimiter, getRequestClientKey } from "@/lib/server/rate-limit"

describe("fixed-window rate limiter", () => {
  it("blocks requests above the limit until the window resets", () => {
    const check = createFixedWindowRateLimiter()

    expect(check("client", { limit: 2, windowMs: 1_000, now: 100 }).allowed).toBe(true)
    expect(check("client", { limit: 2, windowMs: 1_000, now: 200 }).allowed).toBe(true)
    expect(check("client", { limit: 2, windowMs: 1_000, now: 300 })).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    })
    expect(check("client", { limit: 2, windowMs: 1_000, now: 1_100 }).allowed).toBe(true)
  })

  it("uses the first forwarded address as the client key", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.10, 198.51.100.2" },
    })

    expect(getRequestClientKey(request)).toBe("203.0.113.10")
  })
})
