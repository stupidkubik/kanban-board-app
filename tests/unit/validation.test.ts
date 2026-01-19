import { describe, expect, it } from "vitest"

import { isNonEmpty, isValidEmail } from "@/lib/validation"

describe("validation", () => {
  it("validates email", () => {
    expect(isValidEmail("user@example.com")).toBe(true)
    expect(isValidEmail("not-an-email")).toBe(false)
  })

  it("validates non-empty strings", () => {
    expect(isNonEmpty("  value ")).toBe(true)
    expect(isNonEmpty("   ")).toBe(false)
  })
})
