"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"

import { useAuth } from "@/components/auth-provider"
import { ColumnsGrid } from "@/components/board/columns-grid"
import { ParticipantsSection, type Participant } from "@/components/board/participants-section"
import {
  useCreateCardMutation,
  useCreateColumnMutation,
  useDeleteCardMutation,
  useDeleteColumnMutation,
  useGetBoardMembersQuery,
  useGetBoardQuery,
  useGetCardsQuery,
  useGetColumnsQuery,
  useUpdateCardMutation,
  useUpdateColumnMutation,
} from "@/lib/store/firestore-api"
import { clientDb } from "@/lib/firebase/client"
import { getColumnIdFromDropId } from "@/lib/board-dnd"
import { getCopy, type Locale } from "@/lib/i18n"
import { canEditBoard, canInviteMembers, getMemberRole } from "@/lib/permissions"
import {
  resetAddCardForm,
  selectBoardUi,
  setAddCardField,
  startEditingCard as startEditingCardAction,
  stopEditingCard,
  toggleAddCardForm,
  updateEditingCardField,
} from "@/lib/store/board-ui-slice"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { isNonEmpty, isValidEmail } from "@/lib/validation"
import { type BoardRole, type Card as BoardCard, type Column } from "@/lib/types/boards"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import styles from "@/components/board-page.module.css"
type DragCardData = { columnId?: string }

// Keep gaps so we can insert cards without reindexing whole columns.
const ORDER_GAP = 1000

const getNextOrderValue = (before?: number, after?: number) => {
  if (typeof before === "number" && typeof after === "number") {
    const middle = (before + after) / 2
    if (Number.isFinite(middle)) {
      return middle
    }
  }

  if (typeof before === "number") {
    return before + ORDER_GAP
  }

  if (typeof after === "number") {
    return after - ORDER_GAP
  }

  return Date.now()
}

const formatDateInput = (value?: number) => {
  if (!value) {
    return ""
  }
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateInput = (value: string) => {
  if (!value) {
    return null
  }
  const [year, month, day] = value.split("-").map((part) => Number(part))
  if (!year || !month || !day) {
    return null
  }
  return new Date(year, month - 1, day)
}

export function BoardPage() {
  const params = useParams<{ boardId?: string | string[] }>()
  const { user } = useAuth()
  const boardId = Array.isArray(params?.boardId)
    ? params.boardId[0]
    : params?.boardId
  const dispatch = useAppDispatch()
  const [uiLocale, setUiLocale] = React.useState<Locale>("ru")
  const [showAddColumn, setShowAddColumn] = React.useState(false)
  const [newColumnTitle, setNewColumnTitle] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState("")
  const [deletePendingId, setDeletePendingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<BoardRole>("editor")
  const [invitePending, setInvitePending] = React.useState(false)
  const [deleteCardOpen, setDeleteCardOpen] = React.useState(false)
  const [deleteCardId, setDeleteCardId] = React.useState<string | null>(null)
  const [deleteCardTitle, setDeleteCardTitle] = React.useState("")
  const [hoveredColumnId, setHoveredColumnId] = React.useState<string | null>(null)
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null)
  const [activeCardColumnId, setActiveCardColumnId] = React.useState<string | null>(null)
  const [overCardId, setOverCardId] = React.useState<string | null>(null)

  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
  }, [])

  const { data: board } = useGetBoardQuery(boardId ?? null, {
    skip: !boardId,
  })

  const { data: columns = [] } = useGetColumnsQuery(boardId ?? null, {
    skip: !boardId,
  })
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
  const editingCard = boardUi.editingCard
  const editCardOpen = editingCard.id !== null
  const { data: memberProfiles = [] } = useGetBoardMembersQuery(boardId ?? null, {
    skip: !boardId,
  })

  const [createCard, { isLoading: creatingCard }] = useCreateCardMutation()
  const [updateCard, { isLoading: updatingCard }] = useUpdateCardMutation()
  const [deleteCard, { isLoading: deletingCard }] = useDeleteCardMutation()
  const [createColumn, { isLoading: creatingColumn }] =
    useCreateColumnMutation()
  const [updateColumn, { isLoading: updatingColumn }] =
    useUpdateColumnMutation()
  const [deleteColumn] = useDeleteColumnMutation()

  const role = board ? getMemberRole(board, user?.uid) : null
  const canEdit = board ? canEditBoard(board, user?.uid) : false
  const isViewer = role === "viewer"
  const isOwner = board ? canInviteMembers(board, user?.uid) : false
  const memberProfilesById = React.useMemo(() => {
    return new Map(memberProfiles.map((member) => [member.id, member]))
  }, [memberProfiles])
  const participants = React.useMemo<Participant[]>(() => {
    if (!board) {
      return []
    }

    return Object.entries(board.members)
      .filter(([, isMember]) => isMember)
      .map(([memberId]) => {
        const profile = memberProfilesById.get(memberId)
        const isYou = memberId === user?.uid
        const displayName =
          profile?.displayName ?? (isYou ? user?.displayName : null)
        const email = profile?.email ?? (isYou ? user?.email : null)
        const photoURL =
          profile?.photoURL ?? (isYou ? user?.photoURL : null)
        const roleKey =
          board.roles?.[memberId] ?? (memberId === board.ownerId ? "owner" : "member")

        return {
          id: memberId,
          name: displayName || email || memberId,
          secondaryLabel:
            displayName && email && displayName !== email ? email : null,
          photoURL,
          role: roleKey as Participant["role"],
          isYou,
        }
      })
  }, [board, memberProfilesById, user?.displayName, user?.email, user?.photoURL, user?.uid])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragCancel = React.useCallback(() => {
    setHoveredColumnId(null)
    setActiveCardId(null)
    setActiveCardColumnId(null)
    setOverCardId(null)
  }, [])

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

  const handleCreateColumn = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!boardId || !user) {
      return
    }

    if (!isNonEmpty(newColumnTitle)) {
      setError(uiCopy.board.errors.columnTitleRequired)
      return
    }

    setError(null)

    try {
      await createColumn({
        boardId,
        title: newColumnTitle.trim(),
      }).unwrap()
      setNewColumnTitle("")
      setShowAddColumn(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.createColumnFailed
      )
    }
  }, [
    boardId,
    createColumn,
    newColumnTitle,
    uiCopy.board.errors.columnTitleRequired,
    uiCopy.board.errors.createColumnFailed,
    user,
  ])

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
      boardId,
      addCardDrafts,
      createCard,
      dispatch,
      uiCopy.board.cardTitleRequired,
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
    [boardId, canEdit, dispatch, formatDateInput]
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
  }, [isOwner, uiCopy.board.errors.onlyOwnerCanDelete])

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
  }, [boardId, deleteCard, deleteCardId, resetDeleteCard, uiCopy.board.errors.deleteCardFailed])

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
    [cardColumnById]
  )

  const formatDueDate = (value?: number) => {
    if (!value) {
      return null
    }
    const locale = uiLocale === "ru" ? "ru-RU" : "en-US"
    return new Date(value).toLocaleDateString(locale)
  }

  const startEditing = React.useCallback((column: Column) => {
    if (!canEdit) {
      return
    }
    setEditingId(column.id)
    setEditingTitle(column.title)
  }, [canEdit])

  const cancelEditing = React.useCallback(() => {
    setEditingId(null)
    setEditingTitle("")
  }, [])

  const commitEditing = React.useCallback(async () => {
    if (!boardId || !editingId) {
      return
    }

    if (!isNonEmpty(editingTitle)) {
      setError(uiCopy.board.errors.columnTitleRequired)
      return
    }

    setError(null)

    try {
      await updateColumn({
        boardId,
        columnId: editingId,
        title: editingTitle.trim(),
      }).unwrap()
      cancelEditing()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.updateColumnFailed
      )
    }
  }, [
    boardId,
    canEdit,
    editingId,
    editingTitle,
    uiCopy.board.errors.columnTitleRequired,
    uiCopy.board.errors.updateColumnFailed,
    updateColumn,
  ])

  const handleDeleteColumn = React.useCallback(async (columnId: string) => {
    if (!boardId) {
      return
    }

    setError(null)
    setDeletePendingId(columnId)

    try {
      await deleteColumn({ boardId, columnId }).unwrap()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.deleteColumnFailed
      )
    } finally {
      setDeletePendingId(null)
    }
  }, [boardId, deleteColumn, uiCopy.board.errors.deleteColumnFailed])

  const handleInvite = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!board) {
      return
    }

    if (!user) {
      setError(uiCopy.board.errors.signInToInvite)
      return
    }

    if (board.ownerId !== user.uid) {
      setError(uiCopy.board.errors.onlyOwnerCanInvite)
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError(uiCopy.board.errors.inviteInvalidEmail)
      return
    }

    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      setError(uiCopy.board.errors.inviteSelf)
      return
    }

    setError(null)
    setInvitePending(true)

    try {
      const inviteId = `${board.id}__${normalizedEmail}`
      await setDoc(doc(clientDb, "boardInvites", inviteId), {
        boardId: board.id,
        boardTitle: board.title,
        email: normalizedEmail,
        role: inviteRole,
        invitedById: user.uid,
        createdAt: serverTimestamp(),
      })
      setInviteEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.inviteFailed)
    } finally {
      setInvitePending(false)
    }
  }, [
    board,
    inviteEmail,
    inviteRole,
    uiCopy.board.errors.inviteFailed,
    uiCopy.board.errors.inviteInvalidEmail,
    uiCopy.board.errors.inviteSelf,
    uiCopy.board.errors.onlyOwnerCanInvite,
    uiCopy.board.errors.signInToInvite,
    user,
  ])

  if (!boardId) {
    return null
  }

  return (
    <div className={styles.page}>
      <AlertDialog
        open={editCardOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetEditCard()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{uiCopy.board.editCardTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {uiCopy.board.editCardDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form className={styles.cardForm} onSubmit={handleUpdateCard}>
            <Input
              value={editingCard.title}
              onChange={(event) =>
                boardId &&
                dispatch(
                  updateEditingCardField({
                    boardId,
                    field: "title",
                    value: event.target.value,
                  })
                )
              }
              placeholder={uiCopy.board.cardTitlePlaceholder}
              aria-label={uiCopy.board.cardTitlePlaceholder}
              disabled={!canEdit || updatingCard}
              autoFocus
            />
            <Textarea
              value={editingCard.description}
              onChange={(event) =>
                boardId &&
                dispatch(
                  updateEditingCardField({
                    boardId,
                    field: "description",
                    value: event.target.value,
                  })
                )
              }
              placeholder={uiCopy.board.cardDescriptionPlaceholder}
              aria-label={uiCopy.board.cardDescriptionPlaceholder}
              rows={4}
              disabled={!canEdit || updatingCard}
            />
            <div className={styles.cardFormRow}>
              <Input
                className={styles.cardDateInput}
                value={editingCard.due}
                onChange={(event) =>
                  boardId &&
                  dispatch(
                    updateEditingCardField({
                      boardId,
                      field: "due",
                      value: event.target.value,
                    })
                  )
                }
                type="date"
                aria-label={uiCopy.board.cardDueDateLabel}
                disabled={!canEdit || updatingCard}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">
                {uiCopy.common.cancel}
              </AlertDialogCancel>
              <Button type="submit" disabled={!canEdit || updatingCard}>
                {updatingCard ? uiCopy.board.savingCard : uiCopy.board.saveCard}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={deleteCardOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDeleteCard()
          } else {
            setDeleteCardOpen(true)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{uiCopy.board.deleteCardTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {uiCopy.board.deleteCardDescription}
              {deleteCardTitle ? ` "${deleteCardTitle}"` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {uiCopy.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={handleDeleteCard}
              disabled={!isOwner || deletingCard}
            >
              {uiCopy.board.deleteCard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{board?.title ?? "Board"}</h1>
          <p className={styles.subtitle}>{uiCopy.board.columnsTitle}</p>
        </div>
        <div className={styles.actions}>
          {canEdit ? (
            showAddColumn ? (
              <form className={styles.inlineForm} onSubmit={handleCreateColumn}>
                <Input
                  className={styles.columnTitleInput}
                  value={newColumnTitle}
                  onChange={(event) => setNewColumnTitle(event.target.value)}
                  placeholder={uiCopy.board.columnNamePlaceholder}
                  aria-label={uiCopy.board.columnNamePlaceholder}
                  disabled={!canEdit || creatingColumn}
                />
                <Button type="submit" disabled={!canEdit || creatingColumn}>
                  {creatingColumn
                    ? uiCopy.board.creatingColumn
                    : uiCopy.board.createColumn}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddColumn(false)
                    setNewColumnTitle("")
                  }}
                >
                  {uiCopy.common.cancel}
                </Button>
              </form>
            ) : (
              <Button type="button" onClick={() => setShowAddColumn(true)}>
                {uiCopy.board.addColumn}
              </Button>
            )
          ) : null}
          {isViewer ? (
            <span className={styles.readOnlyNotice}>
              {uiCopy.board.readOnlyNotice}
            </span>
          ) : null}
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {board ? (
        <ParticipantsSection
          uiCopy={uiCopy}
          uiLocale={uiLocale}
          participants={participants}
          isOwner={isOwner}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          invitePending={invitePending}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={(value) => setInviteRole(value)}
          onInviteSubmit={handleInvite}
        />
      ) : null}
      <ColumnsGrid
        columns={columns}
        cardsByColumn={cardsByColumn}
        canEdit={canEdit}
        isOwner={isOwner}
        uiCopy={uiCopy}
        dndSensors={sensors}
        hoveredColumnId={hoveredColumnId}
        activeCardId={activeCardId}
        activeCardColumnId={activeCardColumnId}
        overCardId={overCardId}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        editingId={editingId}
        editingTitle={editingTitle}
        onEditingTitleChange={setEditingTitle}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onCommitEditing={commitEditing}
        updatingColumn={updatingColumn}
        deletePendingId={deletePendingId}
        onDeleteColumn={handleDeleteColumn}
        creatingCard={creatingCard}
        showAddCardByColumn={showAddCardByColumn}
        onToggleAddCard={toggleAddCard}
        newCardTitleByColumn={newCardTitleByColumn}
        onChangeCardTitle={handleCardTitleChange}
        newCardDescriptionByColumn={newCardDescriptionByColumn}
        onChangeCardDescription={handleCardDescriptionChange}
        newCardDueByColumn={newCardDueByColumn}
        onChangeCardDue={handleCardDueChange}
        onCreateCard={handleCreateCard}
        onCancelCreateCard={cancelCreateCard}
        onStartEditingCard={startEditingCard}
        onStartDeletingCard={startDeletingCard}
        formatDueDate={formatDueDate}
      />
    </div>
  )
}
