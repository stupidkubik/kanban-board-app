import { describe, expect, it } from "vitest"

import { getLabelColorStyle } from "@/lib/label-palette"

describe("label palette", () => {
  it("maps every persisted label colour to a semantic colour token", () => {
    expect(getLabelColorStyle("blue")).toEqual({
      "--label-color": "var(--color-label-blue)",
    })
    expect(getLabelColorStyle("yellow")).toEqual({
      "--label-color": "var(--color-label-yellow)",
    })
  })
})
