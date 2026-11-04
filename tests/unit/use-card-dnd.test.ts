import { act, renderHook } from "@testing-library/react"
import type { DragEndEvent } from "@dnd-kit/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Card } from "@/lib/types/boards"

const mocks = vi.hoisted(() => ({
  rebalanceCardOrders: vi.fn(),
}))

vi.mock("@/features/cards/data/card-operations", () => ({
  rebalanceCardOrders: mocks.rebalanceCardOrders,
}))

import { useCardDnd } from "@/features/cards/model/use-card-dnd"
import { getColumnDropId } from "@/lib/board-dnd"

const makeCard = (id: string, columnId: string, order: number): Card => ({
  id,
  boardId: "board-1",
  columnId,
  title: id,
  order,
  createdById: "owner",
})

const setup = (cards: Card[]) => {
  const cardsByColumn = new Map<string, Card[]>()
  const cardColumnById = new Map<string, string>()
  for (const card of [...cards].sort((a, b) => a.order - b.order)) {
    cardsByColumn.set(card.columnId, [
      ...(cardsByColumn.get(card.columnId) ?? []),
      card,
    ])
    cardColumnById.set(card.id, card.columnId)
  }
  const moveCard = vi.fn(async () => undefined)
  const setError = vi.fn()
  const { result } = renderHook(() =>
    useCardDnd({
      boardId: "board-1",
      canEdit: true,
      cards,
      cardsByColumn,
      cardColumnById,
      moveCard,
      setError,
      updateFailedMessage: "Update failed",
    })
  )

  const drop = async (activeId: string, overId: string) => {
    await act(async () => {
      await result.current.handleDragEnd({
        active: {
          id: activeId,
          data: { current: { columnId: cardColumnById.get(activeId) } },
        },
        over: { id: overId },
      } as unknown as DragEndEvent)
    })
  }

  return { drop, moveCard, setError }
}

const todo = [
  makeCard("a", "todo", 1000),
  makeCard("b", "todo", 2000),
  makeCard("c", "todo", 3000),
]

describe("useCardDnd.handleDragEnd", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rebalanceCardOrders.mockResolvedValue(undefined)
  })

  it("places a card dragged down within its column after the card it is over", async () => {
    const { drop, moveCard } = setup(todo)

    await drop("a", "b")

    expect(moveCard).toHaveBeenCalledWith({
      boardId: "board-1",
      cardId: "a",
      columnId: "todo",
      order: 2500,
    })
  })

  it("places a card dragged up within its column before the card it is over", async () => {
    const { drop, moveCard } = setup(todo)

    await drop("c", "b")

    expect(moveCard).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: "c", order: 1500 })
    )
  })

  it("moves a card to the last slot when dragged down onto the last card", async () => {
    const { drop, moveCard } = setup(todo)

    await drop("b", "c")

    expect(moveCard).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: "b", order: 4000 })
    )
  })

  it("inserts before the card it is over in another column", async () => {
    const { drop, moveCard } = setup([...todo, makeCard("x", "done", 1000)])

    await drop("a", "x")

    expect(moveCard).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: "a", columnId: "done", order: 0 })
    )
  })

  it("appends to an empty column", async () => {
    const { drop, moveCard } = setup(todo)

    await drop("a", getColumnDropId("done"))

    expect(moveCard).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: "a", columnId: "done", order: 1000 })
    )
  })

  it("does not rebalance between cards with Date.now()-scale orders", async () => {
    const created = 1_762_000_000_000
    const { drop, moveCard } = setup([
      makeCard("a", "todo", created),
      makeCard("b", "todo", created + 5_000),
      makeCard("c", "todo", created + 9_000),
    ])

    await drop("c", "b")

    expect(moveCard).toHaveBeenCalledTimes(1)
    expect(mocks.rebalanceCardOrders).not.toHaveBeenCalled()
  })

  it("rebalances a collapsed gap writing only orders", async () => {
    const { drop } = setup([
      makeCard("a", "todo", 1000),
      makeCard("b", "todo", 1000.0005),
      makeCard("c", "todo", 3000),
    ])

    await drop("c", "b")

    expect(mocks.rebalanceCardOrders).toHaveBeenCalledWith({
      boardId: "board-1",
      cards: [
        { cardId: "a", order: 1000 },
        { cardId: "c", order: 2000 },
        { cardId: "b", order: 3000 },
      ],
    })
  })
})
