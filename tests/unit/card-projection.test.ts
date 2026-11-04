import { describe, expect, it } from "vitest"

import { projectCards } from "@/features/cards/model/card-projection"
import type { Card } from "@/lib/types/boards"

const card = (id: string, columnId: string, order: number): Card => ({
  id,
  boardId: "board-1",
  columnId,
  title: id,
  order,
  createdById: "user-1",
  createdAt: 1,
  updatedAt: 1,
})

describe("projectCards", () => {
  it("groups cards by column and sorts each group without mutating query data", () => {
    const cards = [
      card("later", "column-1", 20),
      card("other", "column-2", 5),
      card("earlier", "column-1", 10),
    ]

    const projection = projectCards(cards)

    expect(projection.cards).toEqual(cards)
    expect(projection.cards.map(({ id }) => id)).toEqual([
      "later",
      "other",
      "earlier",
    ])
    expect(
      projection.cardsByColumn.get("column-1")?.map(({ id }) => id)
    ).toEqual(["earlier", "later"])
    expect(projection.cardColumnById.get("other")).toBe("column-2")
    expect(projectCards(cards)).toBe(projection)
  })

  it("returns empty maps for missing data", () => {
    const projection = projectCards(undefined)

    expect(projection.cards).toEqual([])
    expect(projection.cardsByColumn.size).toBe(0)
    expect(projection.cardColumnById.size).toBe(0)
  })

  it("hides archived cards but counts them toward the card cap", () => {
    const cards = [
      card("visible", "column-1", 10),
      { ...card("archived", "column-1", 20), archived: true },
    ]

    const projection = projectCards(cards)

    expect(projection.cards.map(({ id }) => id)).toEqual(["visible"])
    expect(
      projection.cardsByColumn.get("column-1")?.map(({ id }) => id)
    ).toEqual(["visible"])
    expect(projection.cardColumnById.has("archived")).toBe(false)
    // The listener window is limit(500) over all documents (review C8).
    expect(projection.documentCount).toBe(2)
  })
})
