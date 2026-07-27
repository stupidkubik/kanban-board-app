import { configureStore } from "@reduxjs/toolkit"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Board } from "@/lib/types/boards"

const mocks = vi.hoisted(() => ({
  subscribeToBoard: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock("@/lib/store/firestore-listeners", () => ({
  BOARD_CARD_LIMIT: 500,
  BOARD_COLUMN_LIMIT: 100,
  BOARD_MEMBER_LIMIT: 100,
  subscribeToBoard: mocks.subscribeToBoard,
  subscribeToBoardMembers: vi.fn(),
  subscribeToBoards: vi.fn(),
  subscribeToCards: vi.fn(),
  subscribeToColumns: vi.fn(),
  subscribeToInvites: vi.fn(),
}))

vi.mock("@/lib/store/firestore-operations", () => ({
  createBoard: vi.fn(),
  createColumn: vi.fn(),
  deleteBoard: vi.fn(),
  deleteColumn: vi.fn(),
  updateBoardLanguage: vi.fn(),
  updateBoardTitle: vi.fn(),
  updateColumn: vi.fn(),
}))

vi.mock("@/features/cards/data/card-operations", () => ({
  createCard: vi.fn(),
  deleteCard: vi.fn(),
  updateCard: vi.fn(),
}))

vi.mock("@/features/cards/model/card-normalizers", () => ({
  ensureCardId: vi.fn((_boardId: string, cardId?: string) => cardId ?? "card-1"),
  ensureCardOrder: vi.fn((order?: number) => order ?? 1),
}))

vi.mock("@/features/cards/model/optimistic-helpers", () => ({
  optimisticCreateCard: vi.fn(),
  optimisticDeleteCard: vi.fn(),
  optimisticMoveCard: vi.fn(),
}))

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  fetchWithAppCheck: vi.fn(),
}))

import { firestoreApi } from "@/lib/store/firestore-api"

const board: Board = {
  id: "board-1",
  title: "Board",
  ownerId: "owner-1",
  members: { "owner-1": true },
  roles: { "owner-1": "owner" },
}

describe("Firestore RTK Query listeners", () => {
  afterEach(() => {
    mocks.subscribeToBoard.mockReset()
    mocks.unsubscribe.mockReset()
  })

  it("keeps a synchronous initial board snapshot after cache initialization", async () => {
    mocks.subscribeToBoard.mockImplementation(
      (
        _boardId: string,
        onData: (nextBoard: Board | null) => void
      ) => {
        onData(board)
        return mocks.unsubscribe
      }
    )

    const store = configureStore({
      reducer: {
        [firestoreApi.reducerPath]: firestoreApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(firestoreApi.middleware),
    })
    const args = { boardId: board.id, subscriptionKey: 0 }
    const subscription = store.dispatch(firestoreApi.endpoints.getBoard.initiate(args))

    await subscription
    await vi.waitFor(() => {
      expect(firestoreApi.endpoints.getBoard.select(args)(store.getState()).data).toEqual({
        status: "ready",
        board,
      })
    })

    store.dispatch(firestoreApi.util.resetApiState())
    await vi.waitFor(() => expect(mocks.unsubscribe).toHaveBeenCalledOnce())
  })
})
