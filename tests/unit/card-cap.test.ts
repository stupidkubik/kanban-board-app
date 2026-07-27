import { describe, expect, it } from "vitest"

import { hasReachedCardLimit } from "@/features/cards/model/card-cap"

describe("card cap", () => {
  it("allows edits below the cap and blocks them at the boundary", () => {
    expect(hasReachedCardLimit(499, 500)).toBe(false)
    expect(hasReachedCardLimit(500, 500)).toBe(true)
    expect(hasReachedCardLimit(501, 500)).toBe(true)
  })
})
