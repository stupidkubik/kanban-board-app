import { describe, expect, it } from "vitest"

import {
  normalizeBoardLabel,
  normalizeLabelIds,
  normalizeLabelName,
} from "@/features/labels/model/label-normalizers"

describe("label normalizers", () => {
  it("normalizes names case-insensitively and collapses whitespace", () => {
    expect(normalizeLabelName("  Product   BUG ")).toBe("product bug")
  })

  it("deduplicates, filters, and caps card label ids", () => {
    const ids = [
      "known",
      "known",
      "outsider",
      ...Array.from({ length: 12 }, (_, index) => `label-${index}`),
    ]
    const allowed = new Set([
      "known",
      ...Array.from({ length: 12 }, (_, index) => `label-${index}`),
    ])

    expect(normalizeLabelIds(ids, allowed)).toEqual([
      "known",
      ...Array.from({ length: 9 }, (_, index) => `label-${index}`),
    ])
  })

  it("normalizes a valid catalog record and rejects invalid colors", () => {
    expect(
      normalizeBoardLabel("board-1", "label-1", {
        name: "Bug",
        normalizedName: "bug",
        color: "red",
        order: 1,
      })
    ).toMatchObject({
      id: "label-1",
      boardId: "board-1",
      name: "Bug",
      normalizedName: "bug",
      color: "red",
    })
    expect(
      normalizeBoardLabel("board-1", "label-2", {
        name: "Bug",
        color: "#ff0000",
      })
    ).toBeNull()
  })
})
