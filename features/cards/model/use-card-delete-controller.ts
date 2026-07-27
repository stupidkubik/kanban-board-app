"use client"

import * as React from "react"

import type { Card } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { getErrorMessage } from "@/lib/errors"
import {
  useCreateCardMutation,
  useDeleteCardMutation,
} from "@/features/cards/data/cards-api"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"

type UseCardDeleteControllerArgs = {
  boardId: string | null
  isOwner: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

export const useCardDeleteController = ({
  boardId,
  isOwner,
  uiCopy,
  setError,
}: UseCardDeleteControllerArgs) => {
  const [deleteState, setDeleteState] = React.useState<{
    open: boolean
    snapshot: Card | null
  }>({ open: false, snapshot: null })
  const [createCard] = useCreateCardMutation()
  const [deleteCard, { isLoading: deletingCard }] = useDeleteCardMutation()
  const { notify, notifySuccess } = useNotifications()

  const resetDeleteCard = React.useCallback(() => {
    setDeleteState({ open: false, snapshot: null })
  }, [])

  const startDeletingCard = React.useCallback(
    (card: Card) => {
      if (!isOwner) {
        setError(uiCopy.board.errors.onlyOwnerCanDelete)
        return
      }
      setDeleteState({ open: true, snapshot: card })
    },
    [isOwner, setError, uiCopy.board.errors.onlyOwnerCanDelete]
  )

  const handleDeleteCard = React.useCallback(async () => {
    const snapshot = deleteState.snapshot
    if (!boardId || !snapshot) {
      return
    }

    setError(null)
    try {
      await deleteCard({ boardId, cardId: snapshot.id }).unwrap()
      resetDeleteCard()
      notify({
        message: uiCopy.board.cardDeletedToast,
        variant: "success",
        actionLabel: uiCopy.common.undo,
        onAction: async () => {
          try {
            await createCard({
              boardId,
              cardId: snapshot.id,
              columnId: snapshot.columnId,
              title: snapshot.title,
              description: snapshot.description ?? null,
              createdById: snapshot.createdById,
              order: snapshot.order,
              assigneeIds: snapshot.assigneeIds,
              labels: snapshot.labels,
              dueAt: snapshot.dueAt ? new Date(snapshot.dueAt) : null,
              archived: snapshot.archived,
            }).unwrap()
            notifySuccess(uiCopy.board.cardRestoredToast)
          } catch (error) {
            setError(getErrorMessage(error, uiCopy.board.errors.createCardFailed))
          }
        },
      })
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.deleteCardFailed))
    }
  }, [
    boardId,
    createCard,
    deleteCard,
    deleteState.snapshot,
    notify,
    notifySuccess,
    resetDeleteCard,
    setError,
    uiCopy,
  ])

  return {
    deletingCard,
    deleteCardOpen: deleteState.open,
    deleteCardTitle: deleteState.snapshot?.title ?? "",
    startDeletingCard,
    resetDeleteCard,
    handleDeleteCard,
  }
}
