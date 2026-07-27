import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Board } from "@/lib/types/boards"

const mocks = vi.hoisted(() => ({
  getCountFromServer: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}))

vi.mock("@/lib/firebase/client", () => ({
  clientDb: { name: "test-db" },
}))

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_parent: unknown, name: string) => `collection:${name}`),
  doc: vi.fn((_db: unknown, collectionName: string, id: string) =>
    `doc:${collectionName}/${id}`
  ),
  getCountFromServer: mocks.getCountFromServer,
  getDocs: mocks.getDocs,
  limit: vi.fn((count: number) => ({ count })),
  onSnapshot: mocks.onSnapshot,
  query: vi.fn((source: unknown) => source),
}))

import { useBoardSummary } from "@/features/boards/model/use-board-summary"

const board: Board = {
  id: "board-1",
  title: "Board",
  ownerId: "owner",
  members: { owner: true },
  roles: { owner: "owner" },
}
const user = {
  uid: "owner",
  displayName: "Owner",
  email: "owner@example.com",
  photoURL: null,
}

describe("useBoardSummary", () => {
  beforeEach(() => {
    mocks.getCountFromServer.mockReset()
    mocks.getDocs.mockReset()
    mocks.onSnapshot.mockReset()
    mocks.getCountFromServer
      .mockResolvedValueOnce({ data: () => ({ count: 2 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 7 }) })
    mocks.getDocs.mockResolvedValue({ docs: [] })
  })

  it("loads one-shot counts without creating realtime listeners", async () => {
    const { result } = renderHook(() =>
      useBoardSummary(board, user as never)
    )

    await waitFor(() => {
      expect(result.current.columnCount).toBe(2)
      expect(result.current.cardCount).toBe(7)
    })

    expect(mocks.getCountFromServer).toHaveBeenCalledTimes(2)
    expect(mocks.getDocs).toHaveBeenCalledOnce()
    expect(mocks.onSnapshot).not.toHaveBeenCalled()
  })
})
