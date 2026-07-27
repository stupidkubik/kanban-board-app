"use client"

import * as React from "react"
import type { User } from "firebase/auth"

import { useBoardCardQuery } from "@/features/cards/model/use-board-card-query"
import { useCardCreateController } from "@/features/cards/model/use-card-create-controller"
import { useCardDeleteController } from "@/features/cards/model/use-card-delete-controller"
import { useCardDnd } from "@/features/cards/model/use-card-dnd"
import { useCardEditController } from "@/features/cards/model/use-card-edit-controller"
import { hasReachedCardLimit } from "@/features/cards/model/card-cap"
import { BOARD_CARD_LIMIT } from "@/lib/store/firestore-listeners"
import type { BoardCopy } from "@/lib/types/board-ui"

type UseBoardCardsArgs = {
  boardId: string | null
  user: User | null
  canEdit: boolean
  isOwner: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
  availableAssigneeIds: ReadonlySet<string>
  availableLabelIds: ReadonlySet<string>
}

export const useBoardCards = (args: UseBoardCardsArgs) => {
  const { boardId, canEdit, uiCopy, setError } = args
  const query = useBoardCardQuery(boardId)
  const createController = useCardCreateController(args)
  const editController = useCardEditController(args)
  const deleteController = useCardDeleteController(args)
  const { updateCard } = editController

  const moveCard = React.useCallback(
    (moveArgs: {
      boardId: string
      cardId: string
      columnId: string
      order: number
    }) => updateCard(moveArgs).unwrap(),
    [updateCard]
  )
  const cardDnd = useCardDnd({
    boardId,
    canEdit,
    cards: query.cards,
    cardsByColumn: query.cardsByColumn,
    cardColumnById: query.cardColumnById,
    moveCard,
    setError,
    updateFailedMessage: uiCopy.board.errors.updateCardFailed,
  })

  const formatDueDate = React.useCallback((value?: number) => {
    if (!value) {
      return null
    }
    const date = new Date(value)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = String(date.getFullYear()).slice(-2)
    return `${day}.${month}.${year}`
  }, [])

  return {
    ...query,
    isCardsLimitReached: hasReachedCardLimit(
      query.cards.length,
      BOARD_CARD_LIMIT
    ),
    ...createController,
    ...editController,
    ...deleteController,
    ...cardDnd,
    formatDueDate,
  }
}
