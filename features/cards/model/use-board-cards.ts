"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import { collection, doc } from "firebase/firestore"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"

import { clientDb } from "@/lib/firebase/client"
import { getColumnIdFromDropId } from "@/lib/board-dnd"
import { formatDateInput, getNextOrderValue, parseDateInput } from "@/lib/board-order"
import {
  useCreateCardMutation,
  useDeleteCardMutation,
  useGetCardsQuery,
  useUpdateCardMutation,
} from "@/lib/store/firestore-api"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  resetAddCardForm,
  selectBoardUi,
  setAddCardField,
  startEditingCard as startEditingCardAction,
  stopEditingCard,
  toggleAddCardForm,
  updateEditingCardField,
} from "@/lib/store/board-ui-slice"
import { isNonEmpty } from "@/lib/validation"
import type { Card as BoardCard } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import type { Locale } from "@/lib/i18n"

type DragCardData = { columnId?: string }

type UseBoardCardsArgs = {
  boardId: string | null
  user: User | null
  canEdit: boolean
  isOwner: boolean
  uiCopy: BoardCopy
  uiLocale: Locale
  setError: (message: string | null) => void
}

export const useBoardCards = ({
  boardId,
  user,
  canEdit,
  isOwner,
  uiCopy,
  uiLocale,
  setError,
}: UseBoardCardsArgs) => {
  const dispatch = useAppDispatch()
  const [deleteCardOpen, setDeleteCardOpen] = React.useState(false)
  const [deleteCardId, setDeleteCardId] = React.useState<string | null>(null)
  const [deleteCardTitle, setDeleteCardTitle] = React.useState("")
  const [hoveredColumnId, setHoveredColumnId] = React.useState<string | null>(null)
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null)
  const [activeCardColumnId, setActiveCardColumnId] = React.useState<string | null>(null)
  const [overCardId, setOverCardId] = React.useState<string | null>(null)

  const {
    data: cards = [],
    cardsByColumn = new Map<string, BoardCard[]>(),
    cardColumnById = new Map<string, string>(),
  } = useGetCardsQuery(boardId ? { boardId } : null, {
    skip: !boardId,
    selectFromResult: ({ data }) => {
      const cardsList = data ?? []
      const byColumn = new Map<string, BoardCard[]>()
      const columnByCard = new Map<string, string>()

      cardsList.forEach((card) => {
        if (card.columnId) {
          const list = byColumn.get(card.columnId)
          if (list) {
            list.push(card)
          } else {
            byColumn.set(card.columnId, [card])
          }
          columnByCard.set(card.id, card.columnId)
        }
      })

      byColumn.forEach((list) => list.sort((a, b) => a.order - b.order))

      return { data: cardsList, cardsByColumn: byColumn, cardColumnById: columnByCard }
    },
  })

  const boardUi = useAppSelector((state) => selectBoardUi(state, boardId ?? null))
  const addCardDrafts = boardUi.addCardByColumn
  const editingCard = boardUi.editingCard
  const editCardOpen = editingCard.id !== null

  const [createCard, { isLoading: creatingCard }] = useCreateCardMutation()
  const [updateCard, { isLoading: updatingCard }] = useUpdateCardMutation()
  const [deleteCard, { isLoading: deletingCard }] = useDeleteCardMutation()

  const showAddCardByColumn = React.useMemo(() => {
    const map: Record<string, boolean> = {}
    Object.entries(addCardDrafts).forEach(([columnId, draft]) => {
      map[columnId] = draft.open
    })
    return map
  }, [addCardDrafts])

  const newCardTitleByColumn = React.useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(addCardDrafts).forEach(([columnId, draft]) => {
      map[columnId] = draft.title
    })
    return map
  }, [addCardDrafts])

  const newCardDescriptionByColumn = React.useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(addCardDrafts).forEach(([columnId, draft]) => {
      map[columnId] = draft.description
    })
    return map
  }, [addCardDrafts])

  const newCardDueByColumn = React.useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(addCardDrafts).forEach(([columnId, draft]) => {
      map[columnId] = draft.due
    })
    return map
  }, [addCardDrafts])

  const toggleAddCard = React.useCallback(
    (columnId: string, open: boolean) => {
      if (!boardId) {
        return
      }
      dispatch(toggleAddCardForm({ boardId, columnId, open }))
    },
    [boardId, dispatch]
  )

  const handleCardTitleChange = React.useCallback(
    (columnId: string, value: string) => {
      if (!boardId) {
        return
      }
      dispatch(setAddCardField({ boardId, columnId, field: "title", value }))
    },
    [boardId, dispatch]
  )

  const handleCardDescriptionChange = React.useCallback(
    (columnId: string, value: string) => {
      if (!boardId) {
        return
      }
      dispatch(setAddCardField({ boardId, columnId, field: "description", value }))
    },
    [boardId, dispatch]
  )

  const handleCardDueChange = React.useCallback(
    (columnId: string, value: string) => {
      if (!boardId) {
        return
      }
      dispatch(setAddCardField({ boardId, columnId, field: "due", value }))
    },
    [boardId, dispatch]
  )

  const cancelCreateCard = React.useCallback(
    (columnId: string) => {
      if (!boardId) {
        return
      }
      dispatch(resetAddCardForm({ boardId, columnId }))
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
      const order = Date.now()
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
          order,
        }).unwrap()

        dispatch(resetAddCardForm({ boardId, columnId }))
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : uiCopy.board.errors.createCardFailed
        )
      }
    },
    [
      addCardDrafts,
      boardId,
      createCard,
      dispatch,
      setError,
      uiCopy.board.errors.cardTitleRequired,
      uiCopy.board.errors.createCardFailed,
      user,
    ]
  )

  const resetEditCard = React.useCallback(() => {
    if (!boardId) {
      return
    }
    dispatch(stopEditingCard({ boardId }))
  }, [boardId, dispatch])

  const handleEditingFieldChange = React.useCallback(
    (field: "title" | "description" | "due", value: string) => {
      if (!boardId) {
        return
      }
      dispatch(updateEditingCardField({ boardId, field, value }))
    },
    [boardId, dispatch]
  )

  const startEditingCard = React.useCallback(
    (card: BoardCard) => {
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

  const handleUpdateCard = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.updateCardFailed
      )
    }
  }, [
    boardId,
    editingCard.description,
    editingCard.due,
    editingCard.id,
    editingCard.title,
    resetEditCard,
    setError,
    uiCopy.board.errors.cardTitleRequired,
    uiCopy.board.errors.updateCardFailed,
    updateCard,
  ])

  const resetDeleteCard = React.useCallback(() => {
    setDeleteCardOpen(false)
    setDeleteCardId(null)
    setDeleteCardTitle("")
  }, [])

  const startDeletingCard = React.useCallback((card: BoardCard) => {
    if (!isOwner) {
      setError(uiCopy.board.errors.onlyOwnerCanDelete)
      return
    }
    setDeleteCardId(card.id)
    setDeleteCardTitle(card.title)
    setDeleteCardOpen(true)
  }, [isOwner, setError, uiCopy.board.errors.onlyOwnerCanDelete])

  const handleDeleteCard = React.useCallback(async () => {
    if (!boardId || !deleteCardId) {
      return
    }

    setError(null)

    try {
      await deleteCard({ boardId, cardId: deleteCardId }).unwrap()
      resetDeleteCard()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.deleteCardFailed
      )
    }
  }, [
    boardId,
    deleteCard,
    deleteCardId,
    resetDeleteCard,
    setError,
    uiCopy.board.errors.deleteCardFailed,
  ])

  const handleDragEnd = React.useCallback(
    async ({ active, over }: DragEndEvent) => {
      setHoveredColumnId(null)
      setActiveCardId(null)
      setActiveCardColumnId(null)
      setOverCardId(null)
      if (!boardId || !canEdit || !over) {
        return
      }

      const activeId = String(active.id)
      const overId = String(over.id)
      const activeColumnId =
        (active.data.current as DragCardData | undefined)?.columnId ??
        cardColumnById.get(activeId)
      const dropColumnId = getColumnIdFromDropId(overId)
      const overColumnId = dropColumnId ?? cardColumnById.get(overId)

      if (!activeColumnId || !overColumnId) {
        return
      }

      if (activeId === overId && activeColumnId === overColumnId) {
        return
      }

      const destinationCards = cardsByColumn?.get(overColumnId) ?? []
      const filteredCards = destinationCards.filter((card) => card.id !== activeId)

      let targetIndex = filteredCards.length
      if (!dropColumnId) {
        const overIndex = filteredCards.findIndex((card) => card.id === overId)
        if (overIndex >= 0) {
          targetIndex = overIndex
        }
      }

      // Compute new order using neighbor gaps to avoid full reindex.
      const beforeCard = filteredCards[targetIndex - 1]
      const afterCard = filteredCards[targetIndex]
      const nextOrder = getNextOrderValue(beforeCard?.order, afterCard?.order)

      const currentCard = cards.find((card) => card.id === activeId)
      if (
        currentCard &&
        currentCard.columnId === overColumnId &&
        currentCard.order === nextOrder
      ) {
        return
      }

      try {
        await updateCard({
          boardId,
          cardId: activeId,
          columnId: overColumnId,
          order: nextOrder,
        }).unwrap()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : uiCopy.board.errors.updateCardFailed
        )
      }
    },
    [
      boardId,
      canEdit,
      cardColumnById,
      cards,
      cardsByColumn,
      setError,
      uiCopy.board.errors.updateCardFailed,
      updateCard,
    ]
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
      const overColumnId = dropColumnId ?? cardColumnById?.get(overId) ?? null
      setHoveredColumnId(overColumnId)
      setOverCardId(dropColumnId ? null : overId)
    },
    [cardColumnById]
  )

  const handleDragStart = React.useCallback(
    ({ active }: DragStartEvent) => {
      if (!canEdit) {
        return
      }
      const activeId = String(active.id)
      const columnId =
        (active.data.current as DragCardData | undefined)?.columnId ??
        cardColumnById.get(activeId) ??
        null
      setActiveCardId(activeId)
      setActiveCardColumnId(columnId)
    },
    [cardColumnById, canEdit]
  )

  const handleDragCancel = React.useCallback(() => {
    setHoveredColumnId(null)
    setActiveCardId(null)
    setActiveCardColumnId(null)
    setOverCardId(null)
  }, [])

  const formatDueDate = React.useCallback(
    (value?: number) => {
      if (!value) {
        return null
      }
      const locale = uiLocale === "ru" ? "ru-RU" : "en-US"
      return new Date(value).toLocaleDateString(locale)
    },
    [uiLocale]
  )

  return {
    cards,
    cardsByColumn,
    cardColumnById,
    creatingCard,
    updatingCard,
    deletingCard,
    showAddCardByColumn,
    newCardTitleByColumn,
    newCardDescriptionByColumn,
    newCardDueByColumn,
    toggleAddCard,
    handleCardTitleChange,
    handleCardDescriptionChange,
    handleCardDueChange,
    cancelCreateCard,
    handleCreateCard,
    editingCard,
    editCardOpen,
    handleEditingFieldChange,
    startEditingCard,
    resetEditCard,
    handleUpdateCard,
    deleteCardOpen,
    deleteCardTitle,
    startDeletingCard,
    resetDeleteCard,
    handleDeleteCard,
    hoveredColumnId,
    activeCardId,
    activeCardColumnId,
    overCardId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    formatDueDate,
  }
}
