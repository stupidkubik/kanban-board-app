import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase/client", () => ({ clientDb: {} }))

const { ensureCardOrder, normalizeCard } = await import(
  "@/features/cards/model/card-normalizers"
)

describe("normalizeCard", () => {
  it("normalizes base fields and filters arrays", () => {
    const timestamp = { toMillis: () => 1700000000000 }
    const card = normalizeCard("board-1", "card-1", {
      columnId: "col-1",
      title: "Fix bugs",
      description: "Details",
      order: 5,
      createdById: "user-1",
      assigneeIds: ["user-2", 123],
      labels: ["bug", null],
      dueAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: true,
    })

    expect(card).toEqual({
      id: "card-1",
      boardId: "board-1",
      columnId: "col-1",
      title: "Fix bugs",
      description: "Details",
      order: 5,
      createdById: "user-1",
      assigneeIds: ["user-2"],
      labels: ["bug"],
      dueAt: 1700000000000,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      archived: true,
    })
  })

  it("falls back to createdBy and skips invalid fields", () => {
    const card = normalizeCard("board-1", "card-2", {
      createdBy: "user-2",
      description: 123,
      assigneeIds: [null, 42],
      labels: "label",
      dueAt: 123,
    })

    expect(card.createdById).toBe("user-2")
    expect(card.description).toBeUndefined()
    expect(card.assigneeIds).toBeUndefined()
    expect(card.labels).toBeUndefined()
    expect(card.dueAt).toBeUndefined()
  })
})

describe("ensureCardOrder", () => {
  it("uses Date.now when order is missing", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(111)

    expect(ensureCardOrder()).toBe(111)

    nowSpy.mockRestore()
  })

  it("returns the provided order", () => {
    expect(ensureCardOrder(42)).toBe(42)
  })
})
