import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Board, Column } from "@/lib/types/boards"

// Queries fed by Firestore listeners have a stub queryFn. A mutation that
// invalidated their tags re-ran the stub and replaced listener data with the
// stub's empty value until the next snapshot (review finding C1).

type Emit<T> = (value: T) => void

const mocks = vi.hoisted(() => ({
  emitBoard: null as Emit<Board | null> | null,
  emitBoards: null as Emit<Board[]> | null,
  emitColumns: null as Emit<Column[]> | null,
  subscribeToBoard: vi.fn(),
  subscribeToBoards: vi.fn(),
  subscribeToColumns: vi.fn(),
}))

vi.mock("@/lib/store/firestore-listeners", () => ({
  BOARD_CARD_LIMIT: 500,
  BOARD_COLUMN_LIMIT: 100,
  BOARD_MEMBER_LIMIT: 100,
  subscribeToBoard: mocks.subscribeToBoard,
  subscribeToBoardMembers: vi.fn(),
  subscribeToBoards: mocks.subscribeToBoards,
  subscribeToCards: vi.fn(),
  subscribeToColumns: mocks.subscribeToColumns,
  subscribeToInvites: vi.fn(),
}))

vi.mock("@/lib/store/firestore-operations", () => ({
  createBoard: vi.fn(async () => "board-new"),
  createColumn: vi.fn(async () => undefined),
  deleteBoard: vi.fn(async () => undefined),
  deleteColumn: vi.fn(async () => undefined),
  updateBoardLanguage: vi.fn(async () => undefined),
  updateBoardTitle: vi.fn(async () => undefined),
  updateColumn: vi.fn(async () => undefined),
}))

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  fetchWithAppCheck: vi.fn(),
}))

import { boardsApi } from "@/features/boards/data/boards-api"
import { columnsApi } from "@/features/columns/data/columns-api"
import { firestoreBaseApi } from "@/lib/store/firestore-base-api"

const board: Board = {
  id: "board-1",
  title: "Board",
  ownerId: "owner-1",
  members: { "owner-1": true },
  roles: { "owner-1": "owner" },
  language: "en",
}

const columns: Column[] = [
  { id: "column-1", title: "Todo", order: 1 } as Column,
  { id: "column-2", title: "Done", order: 2 } as Column,
]

const makeStore = () =>
  configureStore({
    reducer: { [firestoreBaseApi.reducerPath]: firestoreBaseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(firestoreBaseApi.middleware),
  })

type Store = ReturnType<typeof makeStore>

// Let RTK Query run any refetch the mutation triggered.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

const startBoards = async (store: Store) => {
  store.dispatch(boardsApi.endpoints.getBoards.initiate("owner-1"))
  await vi.waitFor(() => expect(mocks.emitBoards).not.toBeNull())
  mocks.emitBoards!([board])
  const select = boardsApi.endpoints.getBoards.select("owner-1")
  await vi.waitFor(() => expect(select(store.getState()).data).toEqual([board]))
  return () => select(store.getState())
}

const boardArgs = { boardId: board.id, subscriptionKey: 0 }

const startBoard = async (store: Store) => {
  store.dispatch(boardsApi.endpoints.getBoard.initiate(boardArgs))
  await vi.waitFor(() => expect(mocks.emitBoard).not.toBeNull())
  mocks.emitBoard!(board)
  const select = boardsApi.endpoints.getBoard.select(boardArgs)
  await vi.waitFor(() =>
    expect(select(store.getState()).data?.status).toBe("ready")
  )
  return () => select(store.getState())
}

const startColumns = async (store: Store) => {
  store.dispatch(columnsApi.endpoints.getColumns.initiate(board.id))
  await vi.waitFor(() => expect(mocks.emitColumns).not.toBeNull())
  mocks.emitColumns!(columns)
  const select = columnsApi.endpoints.getColumns.select(board.id)
  await vi.waitFor(() => expect(select(store.getState()).data).toEqual(columns))
  return () => select(store.getState())
}

describe("mutations on listener-fed queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.emitBoard = null
    mocks.emitBoards = null
    mocks.emitColumns = null
    mocks.subscribeToBoards.mockImplementation(
      (_uid: string, onData: Emit<Board[]>) => {
        mocks.emitBoards = onData
        return vi.fn()
      }
    )
    mocks.subscribeToBoard.mockImplementation(
      (_boardId: string, onData: Emit<Board | null>) => {
        mocks.emitBoard = onData
        return vi.fn()
      }
    )
    mocks.subscribeToColumns.mockImplementation(
      (_boardId: string, onData: Emit<Column[]>) => {
        mocks.emitColumns = onData
        return vi.fn()
      }
    )
  })

  it("keeps the boards list after renaming or deleting a board", async () => {
    const store = makeStore()
    const boards = await startBoards(store)

    await store.dispatch(
      boardsApi.endpoints.updateBoardTitle.initiate({
        boardId: board.id,
        title: "Renamed",
      } as never)
    )
    await settle()
    expect(boards().data).toEqual([board])

    await store.dispatch(
      boardsApi.endpoints.deleteBoard.initiate({ boardId: board.id } as never)
    )
    await settle()
    expect(boards().data).toEqual([board])
    expect(mocks.subscribeToBoards).toHaveBeenCalledTimes(1)
  })

  it("keeps the open board ready after changing its language", async () => {
    const store = makeStore()
    const openBoard = await startBoard(store)

    await store.dispatch(
      boardsApi.endpoints.updateBoardLanguage.initiate({
        boardId: board.id,
        language: "ru",
      } as never)
    )
    await settle()

    expect(openBoard().data).toEqual({ status: "ready", board })
    expect(mocks.subscribeToBoard).toHaveBeenCalledTimes(1)
  })

  it("keeps the columns after creating, renaming, or deleting a column", async () => {
    const store = makeStore()
    const boardColumns = await startColumns(store)

    await store.dispatch(
      columnsApi.endpoints.createColumn.initiate({
        boardId: board.id,
        title: "New",
      } as never)
    )
    await store.dispatch(
      columnsApi.endpoints.updateColumn.initiate({
        boardId: board.id,
        columnId: "column-1",
        title: "Doing",
      } as never)
    )
    await store.dispatch(
      columnsApi.endpoints.deleteColumn.initiate({
        boardId: board.id,
        columnId: "column-2",
      } as never)
    )
    await settle()

    expect(boardColumns().data).toEqual(columns)
    expect(mocks.subscribeToColumns).toHaveBeenCalledTimes(1)
  })

  it("still applies the next listener snapshot", async () => {
    const store = makeStore()
    const boards = await startBoards(store)
    const renamed = { ...board, title: "Renamed" }

    await store.dispatch(
      boardsApi.endpoints.updateBoardTitle.initiate({
        boardId: board.id,
        title: renamed.title,
      } as never)
    )
    mocks.emitBoards!([renamed])

    await vi.waitFor(() => expect(boards().data).toEqual([renamed]))
  })
})
