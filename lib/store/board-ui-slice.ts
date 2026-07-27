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
  assigneeIds: [],
  labelIds: [],
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
      assigneeIds: [],
      labelIds: [],
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
        assigneeIds: [],
        labelIds: [],
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
        assigneeIds?: string[]
        labelIds?: string[]
      }>
    ) {
      const boardState = ensureBoardState(state, action.payload.boardId)
      boardState.editingCard = {
        id: action.payload.cardId,
        title: action.payload.title,
        description: action.payload.description ?? "",
        due: action.payload.due ?? "",
        assigneeIds: action.payload.assigneeIds ?? [],
        labelIds: action.payload.labelIds ?? [],
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
    toggleAddCardAssignee(
      state,
      action: PayloadAction<{
        boardId: string
        columnId: string
        assigneeId: string
      }>
    ) {
      const draft = ensureColumnDraft(
        ensureBoardState(state, action.payload.boardId),
        action.payload.columnId
      )
      const index = draft.assigneeIds.indexOf(action.payload.assigneeId)
      if (index >= 0) {
        draft.assigneeIds.splice(index, 1)
      } else if (draft.assigneeIds.length < 20) {
        draft.assigneeIds.push(action.payload.assigneeId)
      }
    },
    toggleEditingCardAssignee(
      state,
      action: PayloadAction<{ boardId: string; assigneeId: string }>
    ) {
      const draft = ensureBoardState(
        state,
        action.payload.boardId
      ).editingCard
      const index = draft.assigneeIds.indexOf(action.payload.assigneeId)
      if (index >= 0) {
        draft.assigneeIds.splice(index, 1)
      } else if (draft.assigneeIds.length < 20) {
        draft.assigneeIds.push(action.payload.assigneeId)
      }
    },
    toggleAddCardLabel(
      state,
      action: PayloadAction<{
        boardId: string
        columnId: string
        labelId: string
      }>
    ) {
      const draft = ensureColumnDraft(
        ensureBoardState(state, action.payload.boardId),
        action.payload.columnId
      )
      const index = draft.labelIds.indexOf(action.payload.labelId)
      if (index >= 0) {
        draft.labelIds.splice(index, 1)
      } else if (draft.labelIds.length < 10) {
        draft.labelIds.push(action.payload.labelId)
      }
    },
    toggleEditingCardLabel(
      state,
      action: PayloadAction<{ boardId: string; labelId: string }>
    ) {
      const draft = ensureBoardState(
        state,
        action.payload.boardId
      ).editingCard
      const index = draft.labelIds.indexOf(action.payload.labelId)
      if (index >= 0) {
        draft.labelIds.splice(index, 1)
      } else if (draft.labelIds.length < 10) {
        draft.labelIds.push(action.payload.labelId)
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
  toggleAddCardAssignee,
  toggleEditingCardAssignee,
  toggleAddCardLabel,
  toggleEditingCardLabel,
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
