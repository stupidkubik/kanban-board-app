import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FirebaseError } from "firebase/app"
import { Provider } from "react-redux"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Column } from "@/lib/types/boards"

type Emit<T> = (value: T) => void

const mocks = vi.hoisted(() => ({
  subscriptions: [] as Array<{
    onData: Emit<unknown>
    onError: Emit<unknown>
    unsubscribe: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock("@/lib/store/firestore-listeners", () => ({
  BOARD_CARD_LIMIT: 500,
  BOARD_COLUMN_LIMIT: 100,
  BOARD_MEMBER_LIMIT: 100,
  subscribeToBoard: vi.fn(),
  subscribeToBoardMembers: vi.fn(),
  subscribeToBoards: vi.fn(),
  subscribeToCards: vi.fn(),
  subscribeToColumns: vi.fn(
    (_boardId: string, onData: Emit<unknown>, onError: Emit<unknown>) => {
      const unsubscribe = vi.fn()
      mocks.subscriptions.push({ onData, onError, unsubscribe })
      return unsubscribe
    }
  ),
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

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  fetchWithAppCheck: vi.fn(),
}))

import { ListenerErrorNotice } from "@/components/listener-error-notice"
import { columnsApi } from "@/features/columns/data/columns-api"
import { firestoreBaseApi } from "@/lib/store/firestore-base-api"
import { listenerKeys, retryListener } from "@/lib/store/listener-lifecycle"
import { listenerStatusReducer } from "@/lib/store/listener-status-slice"

const columns: Column[] = [{ id: "c1", title: "Todo", order: 1 } as Column]
const key = listenerKeys.columns("board-1")

const makeStore = () =>
  configureStore({
    reducer: {
      listenerStatus: listenerStatusReducer,
      [firestoreBaseApi.reducerPath]: firestoreBaseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(firestoreBaseApi.middleware),
  })

const latest = () => mocks.subscriptions[mocks.subscriptions.length - 1]!

describe("retryable Firestore listeners", () => {
  beforeEach(() => {
    mocks.subscriptions.length = 0
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("records a terminal listener error and recovers on retry", async () => {
    const store = makeStore()
    const select = columnsApi.endpoints.getColumns.select("board-1")
    const subscription = store.dispatch(
      columnsApi.endpoints.getColumns.initiate("board-1")
    )
    await vi.waitFor(() => expect(mocks.subscriptions).toHaveLength(1))

    latest().onData(columns)
    latest().onError(
      new FirebaseError(
        "permission-denied",
        "Missing or insufficient permissions."
      )
    )

    expect(store.getState().listenerStatus[key]).toEqual({
      code: "permission-denied",
    })
    expect(select(store.getState()).data).toEqual([])

    const failed = latest()
    retryListener(key)

    expect(failed.unsubscribe).toHaveBeenCalledOnce()
    expect(mocks.subscriptions).toHaveLength(2)
    expect(store.getState().listenerStatus[key]).toBeUndefined()
    latest().onData(columns)
    expect(select(store.getState()).data).toEqual(columns)

    subscription.unsubscribe()
  })

  it("shows the notice for failed keys and retries them", async () => {
    const store = makeStore()
    store.dispatch(columnsApi.endpoints.getColumns.initiate("board-1"))
    await vi.waitFor(() => expect(mocks.subscriptions).toHaveLength(1))

    render(
      <Provider store={store}>
        <ListenerErrorNotice
          keys={[key, null]}
          message="Could not load"
          retryLabel="Retry"
        />
      </Provider>
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    latest().onError(new FirebaseError("permission-denied", "denied"))
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load")

    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(mocks.subscriptions).toHaveLength(2)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
