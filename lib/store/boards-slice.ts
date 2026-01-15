import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type BoardRole = "owner" | "editor" | "viewer"
export type BoardLanguage = "ru" | "en"

export type Board = {
  id: string
  title: string
  ownerId: string
  members: Record<string, boolean>
  roles?: Record<string, BoardRole>
  language?: BoardLanguage
  pending?: boolean
}

type BoardsState = {
  boards: Record<string, Board>
  order: string[]
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
}

const initialState: BoardsState = {
  boards: {},
  order: [],
  status: "idle",
  error: null,
}

const boardsSlice = createSlice({
  name: "boards",
  initialState,
  reducers: {
    boardsLoading(state) {
      state.status = "loading"
      state.error = null
    },
    boardsReceived(state, action: PayloadAction<Board[]>) {
      const nextBoards: Record<string, Board> = {}
      const nextOrder: string[] = []

      for (const board of action.payload) {
        nextBoards[board.id] = { ...board, pending: false }
        nextOrder.push(board.id)
      }

      for (const id of state.order) {
        const existing = state.boards[id]
        if (existing?.pending && !nextBoards[id]) {
          nextBoards[id] = existing
          nextOrder.push(id)
        }
      }

      state.boards = nextBoards
      state.order = nextOrder
      state.status = "ready"
      state.error = null
    },
    boardsError(state, action: PayloadAction<string>) {
      state.status = "error"
      state.error = action.payload
    },
    boardUpsertOptimistic(state, action: PayloadAction<Board>) {
      const board = action.payload
      state.boards[board.id] = { ...board, pending: true }
      if (!state.order.includes(board.id)) {
        state.order.unshift(board.id)
      }
    },
    boardUpdateOptimistic(
      state,
      action: PayloadAction<{ id: string; changes: Partial<Board> }>
    ) {
      const existing = state.boards[action.payload.id]
      if (!existing) {
        return
      }
      state.boards[action.payload.id] = {
        ...existing,
        ...action.payload.changes,
      }
    },
    boardRemoveOptimistic(state, action: PayloadAction<string>) {
      delete state.boards[action.payload]
      state.order = state.order.filter((id) => id !== action.payload)
    },
    boardsClear() {
      return initialState
    },
  },
})

export const {
  boardsLoading,
  boardsReceived,
  boardsError,
  boardUpsertOptimistic,
  boardUpdateOptimistic,
  boardRemoveOptimistic,
  boardsClear,
} = boardsSlice.actions

export const boardsReducer = boardsSlice.reducer
