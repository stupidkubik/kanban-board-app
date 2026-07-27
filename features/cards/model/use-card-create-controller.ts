"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import { collection, doc } from "firebase/firestore"

import { parseDateInput } from "@/lib/board-order"
import { getErrorMessage } from "@/lib/errors"
import { clientDb } from "@/lib/firebase/client"
import { useCreateCardMutation } from "@/features/cards/data/cards-api"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  resetAddCardForm,
  selectBoardUi,
  setAddCardField,
  toggleAddCardForm,
} from "@/lib/store/board-ui-slice"
import type { BoardCopy } from "@/lib/types/board-ui"
import { isNonEmpty } from "@/lib/validation"

type UseCardCreateControllerArgs = {
  boardId: string | null
  user: User | null
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

export const useCardCreateController = ({
  boardId,
  user,
  uiCopy,
  setError,
}: UseCardCreateControllerArgs) => {
  const dispatch = useAppDispatch()
  const addCardDrafts = useAppSelector(
    (state) => selectBoardUi(state, boardId).addCardByColumn
  )
  const [createCard, { isLoading: creatingCard }] = useCreateCardMutation()

  const draftFields = React.useMemo(() => {
    const showAddCardByColumn: Record<string, boolean> = {}
    const newCardTitleByColumn: Record<string, string> = {}
    const newCardDescriptionByColumn: Record<string, string> = {}
    const newCardDueByColumn: Record<string, string> = {}

    Object.entries(addCardDrafts).forEach(([columnId, draft]) => {
      showAddCardByColumn[columnId] = draft.open
      newCardTitleByColumn[columnId] = draft.title
      newCardDescriptionByColumn[columnId] = draft.description
      newCardDueByColumn[columnId] = draft.due
    })

    return {
      showAddCardByColumn,
      newCardTitleByColumn,
      newCardDescriptionByColumn,
      newCardDueByColumn,
    }
  }, [addCardDrafts])

  const toggleAddCard = React.useCallback(
    (columnId: string, open: boolean) => {
      if (boardId) {
        dispatch(toggleAddCardForm({ boardId, columnId, open }))
      }
    },
    [boardId, dispatch]
  )

  const changeDraftField = React.useCallback(
    (columnId: string, field: "title" | "description" | "due", value: string) => {
      if (boardId) {
        dispatch(setAddCardField({ boardId, columnId, field, value }))
      }
    },
    [boardId, dispatch]
  )

  const cancelCreateCard = React.useCallback(
    (columnId: string) => {
      if (boardId) {
        dispatch(resetAddCardForm({ boardId, columnId }))
      }
    },
    [boardId, dispatch]
  )

  const handleCreateCard = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>, columnId: string) => {
      event.preventDefault()
      if (!boardId || !user) {
        return
      }

      const draft = addCardDrafts[columnId]
      const title = (draft?.title ?? "").trim()
      if (!isNonEmpty(title)) {
        setError(uiCopy.board.errors.cardTitleRequired)
        return
      }

      setError(null)
      const description = (draft?.description ?? "").trim()
      const dueInput = draft?.due ?? ""
      const dueAt = dueInput ? parseDateInput(dueInput) : null
      const cardRef = doc(collection(clientDb, "boards", boardId, "cards"))

      try {
        await createCard({
          cardId: cardRef.id,
          boardId,
          columnId,
          title,
          description: description.length ? description : undefined,
          dueAt: dueAt ?? undefined,
          createdById: user.uid,
          order: Date.now(),
        }).unwrap()
        dispatch(resetAddCardForm({ boardId, columnId }))
      } catch (error) {
        setError(getErrorMessage(error, uiCopy.board.errors.createCardFailed))
      }
    },
    [addCardDrafts, boardId, createCard, dispatch, setError, uiCopy, user]
  )

  return {
    createCard,
    creatingCard,
    ...draftFields,
    toggleAddCard,
    handleCardTitleChange: React.useCallback(
      (columnId: string, value: string) =>
        changeDraftField(columnId, "title", value),
      [changeDraftField]
    ),
    handleCardDescriptionChange: React.useCallback(
      (columnId: string, value: string) =>
        changeDraftField(columnId, "description", value),
      [changeDraftField]
    ),
    handleCardDueChange: React.useCallback(
      (columnId: string, value: string) =>
        changeDraftField(columnId, "due", value),
      [changeDraftField]
    ),
    cancelCreateCard,
    handleCreateCard,
  }
}
