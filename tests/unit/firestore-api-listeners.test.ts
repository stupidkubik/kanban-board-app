import { configureStore } from "@reduxjs/toolkit"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Board } from "@/lib/types/boards"

const mocks = vi.hoisted(() => ({
  fetchWithAppCheck: vi.fn(),
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
  fetchWithAppCheck: mocks.fetchWithAppCheck,
}))

import { firestoreApi } from "@/lib/store/firestore-api"

const board: Board = {
  id: "board-1",
  title: "Board",
  ownerId: "owner-1",
  members: { "owner-1": true },
  roles: { "owner-1": "owner" },
}

const makeStore = () =>
  configureStore({
    reducer: {
      [firestoreApi.reducerPath]: firestoreApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(firestoreApi.middleware),
  })

describe("Firestore RTK Query listeners", () => {
  afterEach(() => {
    mocks.fetchWithAppCheck.mockReset()
    mocks.subscribeToBoard.mockReset()
    mocks.unsubscribe.mockReset()
  })

  it("starts one listener per cache entry and keeps a synchronous initial snapshot", async () => {
    mocks.subscribeToBoard.mockImplementation(
      (
        _boardId: string,
        onData: (nextBoard: Board | null) => void
      ) => {
        onData(board)
        return mocks.unsubscribe
      }
    )

    const store = makeStore()
    const args = { boardId: board.id, subscriptionKey: 0 }
    const firstSubscription = store.dispatch(
      firestoreApi.endpoints.getBoard.initiate(args)
    )
    const secondSubscription = store.dispatch(
      firestoreApi.endpoints.getBoard.initiate(args)
    )

    await Promise.all([firstSubscription, secondSubscription])
    await vi.waitFor(() => {
      expect(firestoreApi.endpoints.getBoard.select(args)(store.getState()).data).toEqual({
        status: "ready",
        board,
      })
    })
    expect(mocks.subscribeToBoard).toHaveBeenCalledOnce()

    store.dispatch(firestoreApi.util.resetApiState())
    await vi.waitFor(() => expect(mocks.unsubscribe).toHaveBeenCalledOnce())
  })

  it("maps listener authorization errors to forbidden state", async () => {
    let onError: (() => void) | undefined
    mocks.subscribeToBoard.mockImplementation(
      (
        _boardId: string,
        _onData: (nextBoard: Board | null) => void,
        nextOnError: () => void
      ) => {
        onError = nextOnError
        return mocks.unsubscribe
      }
    )
    mocks.fetchWithAppCheck.mockResolvedValue(new Response(null, { status: 403 }))

    const store = makeStore()
    const args = { boardId: board.id, subscriptionKey: 0 }
    await store.dispatch(firestoreApi.endpoints.getBoard.initiate(args))
    expect(onError).toBeTypeOf("function")

    onError?.()
    await vi.waitFor(() => {
      expect(firestoreApi.endpoints.getBoard.select(args)(store.getState()).data).toEqual({
        status: "forbidden",
        board: null,
      })
    })

    store.dispatch(firestoreApi.util.resetApiState())
    await vi.waitFor(() => expect(mocks.unsubscribe).toHaveBeenCalledOnce())
  })

  it("creates a fresh listener when retry changes the subscription key", async () => {
    mocks.subscribeToBoard.mockReturnValue(mocks.unsubscribe)

    const store = makeStore()
    const firstArgs = { boardId: board.id, subscriptionKey: 0 }
    const retryArgs = { boardId: board.id, subscriptionKey: 1 }

    await store.dispatch(firestoreApi.endpoints.getBoard.initiate(firstArgs))
    await store.dispatch(firestoreApi.endpoints.getBoard.initiate(retryArgs))

    expect(mocks.subscribeToBoard).toHaveBeenCalledTimes(2)
    expect(mocks.subscribeToBoard).toHaveBeenNthCalledWith(
      1,
      board.id,
      expect.any(Function),
      expect.any(Function)
    )
    expect(mocks.subscribeToBoard).toHaveBeenNthCalledWith(
      2,
      board.id,
      expect.any(Function),
      expect.any(Function)
    )

    store.dispatch(firestoreApi.util.resetApiState())
    await vi.waitFor(() => expect(mocks.unsubscribe).toHaveBeenCalledTimes(2))
  })
})
