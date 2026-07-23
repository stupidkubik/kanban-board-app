"use client"

import * as React from "react"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"

import { rebalanceCardOrders } from "@/features/cards/data/card-operations"
import { getColumnIdFromDropId } from "@/lib/board-dnd"
import { getErrorMessage } from "@/lib/errors"
import {
  getNextOrderValue,
  getRebalancedOrder,
  shouldRebalanceOrder,
} from "@/lib/board-order"
import type { Card } from "@/lib/types/boards"

type DragCardData = { columnId?: string }

type MoveCard = (args: {
  boardId: string
  cardId: string
  columnId: string
  order: number
}) => Promise<unknown>

type UseCardDndArgs = {
  boardId: string | null
  canEdit: boolean
  cards: Card[]
  cardsByColumn: Map<string, Card[]>
  cardColumnById: Map<string, string>
  moveCard: MoveCard
  setError: (message: string | null) => void
  updateFailedMessage: string
}

export function useCardDnd({
  boardId,
  canEdit,
  cards,
  cardsByColumn,
  cardColumnById,
  moveCard,
  setError,
  updateFailedMessage,
}: UseCardDndArgs) {
  const [hoveredColumnId, setHoveredColumnId] = React.useState<string | null>(null)
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null)
  const [activeCardColumnId, setActiveCardColumnId] = React.useState<string | null>(null)
  const [overCardId, setOverCardId] = React.useState<string | null>(null)

  const clearDragState = React.useCallback(() => {
    setHoveredColumnId(null)
    setActiveCardId(null)
    setActiveCardColumnId(null)
    setOverCardId(null)
  }, [])

  const handleDragEnd = React.useCallback(
    async ({ active, over }: DragEndEvent) => {
      clearDragState()
      if (!boardId || !canEdit || !over) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const activeColumnId =
        (active.data.current as DragCardData | undefined)?.columnId ??
        cardColumnById.get(activeId)
      const dropColumnId = getColumnIdFromDropId(overId)
      const overColumnId = dropColumnId ?? cardColumnById.get(overId)

      if (!activeColumnId || !overColumnId) return
      if (activeId === overId && activeColumnId === overColumnId) return

      const destinationCards = cardsByColumn.get(overColumnId) ?? []
      const filteredCards = destinationCards.filter((card) => card.id !== activeId)
      let targetIndex = filteredCards.length

      if (!dropColumnId) {
        const overIndex = filteredCards.findIndex((card) => card.id === overId)
        if (overIndex >= 0) targetIndex = overIndex
      }

      const beforeCard = filteredCards[targetIndex - 1]
      const afterCard = filteredCards[targetIndex]
      const nextOrder = getNextOrderValue(beforeCard?.order, afterCard?.order)
      const shouldRebalance = shouldRebalanceOrder(beforeCard?.order, afterCard?.order)
      const currentCard = cards.find((card) => card.id === activeId)

      if (
        currentCard &&
        currentCard.columnId === overColumnId &&
        currentCard.order === nextOrder &&
        !shouldRebalance
      ) {
        return
      }

      try {
        await moveCard({
          boardId,
          cardId: activeId,
          columnId: overColumnId,
          order: nextOrder,
        })

        if (shouldRebalance && currentCard) {
          const reorderedCards = [...filteredCards]
          reorderedCards.splice(targetIndex, 0, {
            ...currentCard,
            columnId: overColumnId,
            order: nextOrder,
          })
          await rebalanceCardOrders({
            boardId,
            cards: reorderedCards.map((card, index) => ({
              cardId: card.id,
              columnId: overColumnId,
              order: getRebalancedOrder(index),
            })),
          })
        }
      } catch (error) {
        setError(getErrorMessage(error, updateFailedMessage))
      }
    },
    [
      boardId,
      canEdit,
      cardColumnById,
      cards,
      cardsByColumn,
      clearDragState,
      moveCard,
      setError,
      updateFailedMessage,
    ],
  )

  const handleDragOver = React.useCallback(
    ({ over }: DragOverEvent) => {
      if (!over) {
        setHoveredColumnId(null)
        setOverCardId(null)
        return
      }

      const overId = String(over.id)
      const dropColumnId = getColumnIdFromDropId(overId)
      setHoveredColumnId(dropColumnId ?? cardColumnById.get(overId) ?? null)
      setOverCardId(dropColumnId ? null : overId)
    },
    [cardColumnById],
  )

  const handleDragStart = React.useCallback(
    ({ active }: DragStartEvent) => {
      if (!canEdit) return

      const activeId = String(active.id)
      const columnId =
        (active.data.current as DragCardData | undefined)?.columnId ??
        cardColumnById.get(activeId) ??
        null
      setActiveCardId(activeId)
      setActiveCardColumnId(columnId)
    },
    [canEdit, cardColumnById],
  )

  return {
    hoveredColumnId,
    activeCardId,
    activeCardColumnId,
    overCardId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel: clearDragState,
  }
}
