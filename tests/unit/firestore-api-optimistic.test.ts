import { configureStore } from "@reduxjs/toolkit"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Card, Column } from "@/lib/types/boards"

const mocks = vi.hoisted(() => ({
  createCard: vi.fn(),
  deleteCard: vi.fn(),
  updateCard: vi.fn(),
}))

vi.mock("@/lib/store/firestore-listeners", () => ({
  BOARD_CARD_LIMIT: 500,
  BOARD_COLUMN_LIMIT: 100,
  BOARD_MEMBER_LIMIT: 100,
  subscribeToBoard: vi.fn(() => vi.fn()),
  subscribeToBoardMembers: vi.fn(() => vi.fn()),
  subscribeToBoards: vi.fn(() => vi.fn()),
  subscribeToCards: vi.fn(() => vi.fn()),
  subscribeToColumns: vi.fn(() => vi.fn()),
  subscribeToInvites: vi.fn(() => vi.fn()),
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
  createCard: mocks.createCard,
  deleteCard: mocks.deleteCard,
  updateCard: mocks.updateCard,
}))

vi.mock("@/features/cards/model/card-normalizers", () => ({
  ensureCardId: vi.fn((_boardId: string, cardId?: string) => cardId ?? "card-1"),
  ensureCardOrder: vi.fn((order?: number) => order ?? 1),
}))

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  fetchWithAppCheck: vi.fn(),
}))

import { firestoreApi } from "@/lib/store/firestore-api"

const boardId = "board-1"
const todoColumn: Column = {
  id: "todo",
  boardId,
  title: "Todo",
  order: 1,
}
const doneColumn: Column = {
  id: "done",
  boardId,
  title: "Done",
  order: 2,
}
const card: Card = {
  id: "card-1",
  boardId,
  columnId: todoColumn.id,
  title: "Card",
  order: 10,
  createdById: "owner-1",
}

const makeStore = () =>
  configureStore({
    reducer: {
      [firestoreApi.reducerPath]: firestoreApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(firestoreApi.middleware),
  })

type TestStore = ReturnType<typeof makeStore>

const seedCards = async (store: TestStore, cards: Card[]) => {
  await store.dispatch(
    firestoreApi.util.upsertQueryData("getColumns", boardId, [
      todoColumn,
      doneColumn,
    ])
  )
  await Promise.all([
    store.dispatch(
      firestoreApi.util.upsertQueryData("getCards", { boardId }, cards)
    ),
    store.dispatch(
      firestoreApi.util.upsertQueryData(
        "getCards",
        { boardId, columnId: todoColumn.id },
        cards.filter((item) => item.columnId === todoColumn.id)
      )
    ),
    store.dispatch(
      firestoreApi.util.upsertQueryData(
        "getCards",
        { boardId, columnId: doneColumn.id },
        cards.filter((item) => item.columnId === doneColumn.id)
      )
    ),
  ])
}

const selectCards = (
  store: TestStore,
  args: { boardId: string; columnId?: string }
) => firestoreApi.endpoints.getCards.select(args)(store.getState()).data ?? []

const deferred = () => {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

describe("Firestore RTK Query optimistic card mutations", () => {
  afterEach(() => {
    mocks.createCard.mockReset()
    mocks.deleteCard.mockReset()
    mocks.updateCard.mockReset()
  })

  it("does not duplicate an idempotent optimistic create", async () => {
    const firstWrite = deferred()
    const secondWrite = deferred()
    mocks.createCard
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(secondWrite.promise)

    const store = makeStore()
    await seedCards(store, [])
    const input = {
      boardId,
      cardId: card.id,
      columnId: card.columnId,
      title: card.title,
      createdById: card.createdById,
      order: card.order,
    }

    const firstMutation = store.dispatch(
      firestoreApi.endpoints.createCard.initiate({ ...input })
    )
    const secondMutation = store.dispatch(
      firestoreApi.endpoints.createCard.initiate({ ...input })
    )

    await vi.waitFor(() => {
      expect(selectCards(store, { boardId })).toHaveLength(1)
      expect(
        selectCards(store, { boardId, columnId: todoColumn.id })
      ).toHaveLength(1)
    })

    firstWrite.resolve()
    secondWrite.resolve()
    await Promise.all([firstMutation, secondMutation])
    store.dispatch(firestoreApi.util.resetApiState())
  })

  it("rolls back optimistic create after a rejected write", async () => {
    const write = deferred()
    mocks.createCard.mockReturnValue(write.promise)
    const store = makeStore()
    await seedCards(store, [])

    const mutation = store.dispatch(
      firestoreApi.endpoints.createCard.initiate({
        boardId,
        cardId: card.id,
        columnId: card.columnId,
        title: card.title,
        createdById: card.createdById,
        order: card.order,
      })
    )
    await vi.waitFor(() =>
      expect(selectCards(store, { boardId })).toHaveLength(1)
    )

    write.reject(new Error("create failed"))
    await mutation

    expect(selectCards(store, { boardId })).toEqual([])
    expect(
      selectCards(store, { boardId, columnId: todoColumn.id })
    ).toEqual([])
    store.dispatch(firestoreApi.util.resetApiState())
  })

  it("restores column and order after a rejected optimistic move", async () => {
    const write = deferred()
    mocks.updateCard.mockReturnValue(write.promise)
    const store = makeStore()
    await seedCards(store, [card])

    const mutation = store.dispatch(
      firestoreApi.endpoints.updateCard.initiate({
        boardId,
        cardId: card.id,
        columnId: doneColumn.id,
        order: 20,
      })
    )
    await vi.waitFor(() => {
      expect(selectCards(store, { boardId })[0]).toMatchObject({
        columnId: doneColumn.id,
        order: 20,
      })
      expect(
        selectCards(store, { boardId, columnId: todoColumn.id })
      ).toEqual([])
      expect(
        selectCards(store, { boardId, columnId: doneColumn.id })[0]
      ).toMatchObject({ id: card.id, order: 20 })
    })

    write.reject(new Error("move failed"))
    await mutation

    expect(selectCards(store, { boardId })[0]).toMatchObject({
      columnId: todoColumn.id,
      order: card.order,
    })
    expect(
      selectCards(store, { boardId, columnId: todoColumn.id })[0]
    ).toMatchObject({ id: card.id, order: card.order })
    expect(
      selectCards(store, { boardId, columnId: doneColumn.id })
    ).toEqual([])
    store.dispatch(firestoreApi.util.resetApiState())
  })

  it("restores the same entity after a rejected optimistic delete", async () => {
    const write = deferred()
    mocks.deleteCard.mockReturnValue(write.promise)
    const store = makeStore()
    await seedCards(store, [card])

    const mutation = store.dispatch(
      firestoreApi.endpoints.deleteCard.initiate({
        boardId,
        cardId: card.id,
      })
    )
    await vi.waitFor(() =>
      expect(selectCards(store, { boardId })).toEqual([])
    )

    write.reject(new Error("delete failed"))
    await mutation

    expect(selectCards(store, { boardId })).toEqual([card])
    expect(
      selectCards(store, { boardId, columnId: todoColumn.id })
    ).toEqual([card])
    store.dispatch(firestoreApi.util.resetApiState())
  })
})
