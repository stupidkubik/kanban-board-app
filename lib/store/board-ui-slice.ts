import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { AddCardDraft, EditingCardDraft } from "@/lib/types/board-ui"

type BoardUiState = {
  addCardByColumn: Record<string, AddCardDraft>
  editingCard: EditingCardDraft
}

type State = {
  byBoard: Record<string, BoardUiState>
}

const initialEditingCard: EditingCardDraft = {
  id: null,
  title: "",
  description: "",
  due: "",
}

const emptyBoardUi: BoardUiState = {
  addCardByColumn: {},
  editingCard: initialEditingCard,
}

const initialState: State = {
  byBoard: {},
}

const ensureBoardState = (state: State, boardId: string) => {
  if (!state.byBoard[boardId]) {
    state.byBoard[boardId] = {
      addCardByColumn: {},
      editingCard: { ...initialEditingCard },
    }
  }
  return state.byBoard[boardId]
}

const ensureColumnDraft = (boardState: BoardUiState, columnId: string) => {
  if (!boardState.addCardByColumn[columnId]) {
    boardState.addCardByColumn[columnId] = {
      open: false,
      title: "",
      description: "",
      due: "",
    }
  }
  return boardState.addCardByColumn[columnId]
}

const boardUiSlice = createSlice({
  name: "boardUi",
  initialState,
  reducers: {
    toggleAddCardForm(
      state,
      action: PayloadAction<{ boardId: string; columnId: string; open: boolean }>
    ) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      const draft = ensureColumnDraft(boardState, action.payload.columnId)
      draft.open = action.payload.open
    },
    setAddCardField(
      state,
      action: PayloadAction<{
        boardId: string
        columnId: string
        field: "title" | "description" | "due"
        value: string
      }>
    ) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      const draft = ensureColumnDraft(boardState, action.payload.columnId)
      draft[action.payload.field] = action.payload.value
    },
    resetAddCardForm(
      state,
      action: PayloadAction<{ boardId: string; columnId: string }>
    ) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      boardState.addCardByColumn[action.payload.columnId] = {
        open: false,
        title: "",
        description: "",
        due: "",
      }
    },
    startEditingCard(
      state,
      action: PayloadAction<{
        boardId: string
        cardId: string
        title: string
        description?: string | null
        due?: string
      }>
    ) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      boardState.editingCard = {
        id: action.payload.cardId,
        title: action.payload.title,
        description: action.payload.description ?? "",
        due: action.payload.due ?? "",
      }
    },
    updateEditingCardField(
      state,
      action: PayloadAction<{
        boardId: string
        field: "title" | "description" | "due"
        value: string
      }>
    ) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      boardState.editingCard = {
        ...boardState.editingCard,
        [action.payload.field]: action.payload.value,
      }
    },
    stopEditingCard(state, action: PayloadAction<{ boardId: string }>) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      boardState.editingCard = { ...initialEditingCard }
    },
  },
})

export const {
  toggleAddCardForm,
  setAddCardField,
  resetAddCardForm,
  startEditingCard,
  updateEditingCardField,
  stopEditingCard,
} = boardUiSlice.actions

export const boardUiReducer = boardUiSlice.reducer

export const selectBoardUi = createSelector(
  [
    (state: { boardUi?: State }) => state.boardUi?.byBoard ?? initialState.byBoard,
    (_state: { boardUi?: State }, boardId: string | null | undefined) => boardId,
  ],
  (byBoard, boardId) => {
    if (!boardId) {
      return emptyBoardUi
    }
    return byBoard[boardId] ?? emptyBoardUi
  }
)
