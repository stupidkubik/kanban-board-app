"use client"

import * as React from "react"

import { useUpdateCardMutation } from "@/features/cards/data/cards-api"
import { formatDateInput, parseDateInput } from "@/lib/board-order"
import { getErrorMessage } from "@/lib/errors"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  selectBoardUi,
  startEditingCard as startEditingCardAction,
  stopEditingCard,
  updateEditingCardField,
} from "@/lib/store/board-ui-slice"
import type { BoardCopy } from "@/lib/types/board-ui"
import type { Card } from "@/lib/types/boards"
import { isNonEmpty } from "@/lib/validation"

type UseCardEditControllerArgs = {
  boardId: string | null
  canEdit: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

export const useCardEditController = ({
  boardId,
  canEdit,
  uiCopy,
  setError,
}: UseCardEditControllerArgs) => {
  const dispatch = useAppDispatch()
  const editingCard = useAppSelector(
    (state) => selectBoardUi(state, boardId).editingCard
  )
  const [updateCard, { isLoading: updatingCard }] = useUpdateCardMutation()

  const resetEditCard = React.useCallback(() => {
    if (boardId) {
      dispatch(stopEditingCard({ boardId }))
    }
  }, [boardId, dispatch])

  const handleEditingFieldChange = React.useCallback(
    (field: "title" | "description" | "due", value: string) => {
      if (boardId) {
        dispatch(updateEditingCardField({ boardId, field, value }))
      }
    },
    [boardId, dispatch]
  )

  const startEditingCard = React.useCallback(
    (card: Card) => {
      if (!canEdit || !boardId) {
        return
      }
      dispatch(
        startEditingCardAction({
          boardId,
          cardId: card.id,
          title: card.title,
          description: card.description ?? "",
          due: formatDateInput(card.dueAt) ?? "",
        })
      )
    },
    [boardId, canEdit, dispatch]
  )

  const handleUpdateCard = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!boardId || !editingCard.id) {
        return
      }

      const title = editingCard.title.trim()
      if (!isNonEmpty(title)) {
        setError(uiCopy.board.errors.cardTitleRequired)
        return
      }

      setError(null)
      const description = editingCard.description.trim()
      const dueAt = editingCard.due ? parseDateInput(editingCard.due) : null

      try {
        await updateCard({
          boardId,
          cardId: editingCard.id,
          title,
          description: description.length ? description : null,
          dueAt,
        }).unwrap()
        resetEditCard()
      } catch (error) {
        setError(getErrorMessage(error, uiCopy.board.errors.updateCardFailed))
      }
    },
    [boardId, editingCard, resetEditCard, setError, uiCopy, updateCard]
  )

  return {
    updateCard,
    updatingCard,
    editingCard,
    editCardOpen: editingCard.id !== null,
    handleEditingFieldChange,
    startEditingCard,
    resetEditCard,
    handleUpdateCard,
  }
}
