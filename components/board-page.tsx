"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { useAuth } from "@/components/auth-provider"
import {
  useCreateCardMutation,
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useGetBoardMembersQuery,
  useGetBoardsQuery,
  useGetCardsQuery,
  useGetColumnsQuery,
  useUpdateCardMutation,
  useUpdateColumnMutation,
} from "@/lib/store/firestore-api"
import { clientDb } from "@/lib/firebase/client"
import { getCopy, roleLabels, type Locale } from "@/lib/i18n"
import { type Board, type BoardRole, type Card as BoardCard, type Column } from "@/lib/types/boards"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import styles from "@/components/board-page.module.css"

const isNonEmpty = (value: string) => value.trim().length > 0
const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)
type DisplayRole = "owner" | "editor" | "viewer" | "member"
type DragCardData = { columnId?: string }

const columnDropPrefix = "column:"
const getColumnDropId = (columnId: string) => `${columnDropPrefix}${columnId}`
const getColumnIdFromDropId = (value: string) =>
  value.startsWith(columnDropPrefix) ? value.slice(columnDropPrefix.length) : null

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

type SortableCardItemProps = {
  card: BoardCard
  canEdit: boolean
  dueLabel: string
  formatDueDate: (value?: number) => string | null
}

const SortableCardItem = ({
  card,
  canEdit,
  dueLabel,
  formatDueDate,
}: SortableCardItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { columnId: card.columnId } satisfies DragCardData,
      disabled: !canEdit,
    })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: canEdit ? "grab" : "default",
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        isDragging ? `${styles.cardItem} ${styles.cardDragging}` : styles.cardItem
      }
      {...attributes}
      {...listeners}
    >
      <div className={styles.cardTitle}>{card.title}</div>
      {card.description ? (
        <div className={styles.cardDescription}>{card.description}</div>
      ) : null}
      {card.dueAt ? (
        <div className={styles.cardMeta}>
          {dueLabel}: {formatDueDate(card.dueAt)}
        </div>
      ) : null}
    </li>
  )
}

type ColumnDropZoneProps = {
  id: string
  children: React.ReactNode
}

const ColumnDropZone = ({ id, children }: ColumnDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={
        isOver ? `${styles.columnDropZone} ${styles.columnDropZoneOver}` : styles.columnDropZone
      }
    >
      {children}
    </div>
  )
}

const getMemberRole = (board: Board, uid: string | undefined) => {
  if (!uid) {
    return null
  }

  if (!board.members[uid]) {
    return null
  }

  const explicitRole = board.roles?.[uid]
  if (explicitRole) {
    return explicitRole
  }

  if (board.ownerId === uid) {
    return "owner"
  }

  return "editor"
}

export function BoardPage() {
  const params = useParams<{ boardId?: string | string[] }>()
  const { user } = useAuth()
  const boardId = Array.isArray(params?.boardId)
    ? params.boardId[0]
    : params?.boardId
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
  const [hoveredColumnId, setHoveredColumnId] = React.useState<string | null>(null)
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null)
  const [activeCardColumnId, setActiveCardColumnId] = React.useState<string | null>(null)
  const [overCardId, setOverCardId] = React.useState<string | null>(null)
  const [showAddCardByColumn, setShowAddCardByColumn] = React.useState<
    Record<string, boolean>
  >({})
  const [newCardTitleByColumn, setNewCardTitleByColumn] = React.useState<
    Record<string, string>
  >({})
  const [newCardDescriptionByColumn, setNewCardDescriptionByColumn] = React.useState<
    Record<string, string>
  >({})
  const [newCardDueByColumn, setNewCardDueByColumn] = React.useState<
    Record<string, string>
  >({})

  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
  }, [])

  const { data: boards = [] } = useGetBoardsQuery(user?.uid ?? null, {
    skip: !user?.uid,
  })
  const board = boards.find((item) => item.id === boardId)

  const { data: columns = [] } = useGetColumnsQuery(boardId ?? null, {
    skip: !boardId,
  })
  const { data: cards = [] } = useGetCardsQuery(boardId ? { boardId } : null, {
    skip: !boardId,
  })
  const { data: memberProfiles = [] } = useGetBoardMembersQuery(boardId ?? null, {
    skip: !boardId,
  })

  const [createCard, { isLoading: creatingCard }] = useCreateCardMutation()
  const [updateCard] = useUpdateCardMutation()
  const [createColumn, { isLoading: creatingColumn }] =
    useCreateColumnMutation()
  const [updateColumn, { isLoading: updatingColumn }] =
    useUpdateColumnMutation()
  const [deleteColumn] = useDeleteColumnMutation()

  const role = board ? getMemberRole(board, user?.uid) : null
  const canEdit = role !== "viewer" && !!board
  const isOwner = board?.ownerId === user?.uid
  const memberProfilesById = React.useMemo(() => {
    return new Map(memberProfiles.map((member) => [member.id, member]))
  }, [memberProfiles])
  const cardsByColumn = React.useMemo(() => {
    const map = new Map<string, BoardCard[]>()
    cards.forEach((card) => {
      if (!card.columnId) {
        return
      }
      const list = map.get(card.columnId)
      if (list) {
        list.push(card)
      } else {
        map.set(card.columnId, [card])
      }
    })
    map.forEach((list) => {
      list.sort((a, b) => a.order - b.order)
    })
    return map
  }, [cards])
  const cardColumnById = React.useMemo(() => {
    return new Map(cards.map((card) => [card.id, card.columnId]))
  }, [cards])
  const participants = React.useMemo(() => {
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
          role: roleKey as DisplayRole,
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

  const handleCreateColumn = async (event: React.FormEvent<HTMLFormElement>) => {
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
  }

  const handleCreateCard = async (
    event: React.FormEvent<HTMLFormElement>,
    columnId: string
  ) => {
    event.preventDefault()
    if (!boardId || !user) {
      return
    }

    const title = (newCardTitleByColumn[columnId] ?? "").trim()
    if (!isNonEmpty(title)) {
      setError(uiCopy.board.errors.cardTitleRequired)
      return
    }

    setError(null)

    const description = (newCardDescriptionByColumn[columnId] ?? "").trim()
    const dueInput = newCardDueByColumn[columnId] ?? ""
    const dueAt = dueInput ? new Date(dueInput) : undefined
    const order = Date.now()
    const cardRef = doc(collection(clientDb, "boards", boardId, "cards"))

    try {
      await createCard({
        cardId: cardRef.id,
        boardId,
        columnId,
        title,
        description: description.length ? description : undefined,
        dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : undefined,
        createdById: user.uid,
        order,
      }).unwrap()

      setNewCardTitleByColumn((prev) => ({ ...prev, [columnId]: "" }))
      setNewCardDescriptionByColumn((prev) => ({ ...prev, [columnId]: "" }))
      setNewCardDueByColumn((prev) => ({ ...prev, [columnId]: "" }))
      setShowAddCardByColumn((prev) => ({ ...prev, [columnId]: false }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.createCardFailed
      )
    }
  }

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

      const destinationCards = cardsByColumn.get(overColumnId) ?? []
      const filteredCards = destinationCards.filter((card) => card.id !== activeId)

      let targetIndex = filteredCards.length
      if (!dropColumnId) {
        const overIndex = filteredCards.findIndex((card) => card.id === overId)
        if (overIndex >= 0) {
          targetIndex = overIndex
        }
      }

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
      const overColumnId = dropColumnId ?? cardColumnById.get(overId) ?? null
      setHoveredColumnId(overColumnId)
      setOverCardId(dropColumnId ? null : overId)
    },
    [cardColumnById]
  )

  const handleDragStart = React.useCallback(
    ({ active }: DragStartEvent) => {
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

  const startEditing = (column: Column) => {
    if (!canEdit) {
      return
    }
    setEditingId(column.id)
    setEditingTitle(column.title)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const commitEditing = async () => {
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
  }

  const handleDeleteColumn = async (columnId: string) => {
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
  }

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
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
  }

  if (!boardId) {
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{board?.title ?? "Board"}</h1>
          <p className={styles.subtitle}>{uiCopy.board.columnsTitle}</p>
        </div>
        <div className={styles.actions}>
          {showAddColumn ? (
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
                {creatingColumn ? uiCopy.board.creatingColumn : uiCopy.board.createColumn}
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
            <Button type="button" onClick={() => setShowAddColumn(true)} disabled={!canEdit}>
              {uiCopy.board.addColumn}
            </Button>
          )}
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {board ? (
        <Card className={styles.participantsCard} size="sm">
          <CardHeader>
            <CardTitle>{uiCopy.board.participantsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length ? (
              <>
                <ul className={styles.participantsList}>
                  {participants.map((participant) => (
                    <li key={participant.id} className={styles.participantRow}>
                      <div className={styles.participantIdentity}>
                        <div className={styles.participantAvatar}>
                          {participant.photoURL ? (
                            <img
                              className={styles.participantAvatarImage}
                              src={participant.photoURL}
                              alt={participant.name}
                            />
                          ) : (
                            <span className={styles.participantAvatarFallback}>
                              {participant.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className={styles.participantInfo}>
                          <div className={styles.participantNameRow}>
                            <span className={styles.participantName}>
                              {participant.name}
                            </span>
                            {participant.isYou ? (
                              <span className={styles.participantBadge}>
                                {uiCopy.board.youLabel}
                              </span>
                            ) : null}
                          </div>
                          {participant.secondaryLabel ? (
                            <span className={styles.participantSecondary}>
                              {participant.secondaryLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className={styles.participantRole}>
                        {roleLabels[uiLocale][participant.role]}
                      </span>
                    </li>
                  ))}
                </ul>
                {participants.length === 1 ? (
                  <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
                ) : null}
                {isOwner ? (
                  <form className={styles.inviteForm} onSubmit={handleInvite}>
                    <div className={styles.inviteLabel}>{uiCopy.board.inviteMember}</div>
                    <div className={styles.inviteRow}>
                      <Input
                        className={styles.inviteInput}
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder={uiCopy.board.inviteEmailPlaceholder}
                        aria-label={uiCopy.board.inviteEmailPlaceholder}
                        type="email"
                        disabled={invitePending}
                      />
                      <select
                        className={styles.inviteSelect}
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(event.target.value as BoardRole)
                        }
                        disabled={invitePending}
                      >
                        <option value="editor">{roleLabels[uiLocale].editor}</option>
                        <option value="viewer">{roleLabels[uiLocale].viewer}</option>
                      </select>
                      <Button type="submit" disabled={invitePending}>
                        {invitePending
                          ? uiCopy.board.inviteSending
                          : uiCopy.board.inviteButton}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </>
            ) : (
              <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
            )}
          </CardContent>
        </Card>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setHoveredColumnId(null)
          setActiveCardId(null)
          setActiveCardColumnId(null)
          setOverCardId(null)
        }}
      >
        <div className={styles.columnsGrid}>
          {columns.length ? (
            columns.map((column) => {
              const isEditing = editingId === column.id
              const isDeleting = deletePendingId === column.id
              const cardsInColumn = cardsByColumn.get(column.id) ?? []
              const showAddCard = showAddCardByColumn[column.id] ?? false
              const isDropTarget = hoveredColumnId === column.id
              const showPlaceholder =
                !!activeCardId && !!activeCardColumnId && isDropTarget
              const placeholderIndex = (() => {
                if (!showPlaceholder) {
                  return -1
                }
                if (!overCardId) {
                  return cardsInColumn.length
                }
                const index = cardsInColumn.findIndex((card) => card.id === overCardId)
                return index >= 0 ? index : cardsInColumn.length
              })()

              return (
                <Card
                  key={column.id}
                  className={
                    isDropTarget
                      ? `${styles.columnCard} ${styles.columnCardDropActive}`
                      : styles.columnCard
                  }
                >
                <CardHeader>
                  <div className={styles.columnHeader}>
                    {isEditing ? (
                      <Input
                        className={styles.columnTitleInput}
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            commitEditing()
                          }
                          if (event.key === "Escape") {
                            event.preventDefault()
                            cancelEditing()
                          }
                        }}
                        disabled={!canEdit || updatingColumn}
                        autoFocus
                      />
                    ) : (
                      <button
                        className={styles.columnTitleButton}
                        type="button"
                        onClick={() => startEditing(column)}
                        disabled={!canEdit}
                      >
                        <CardTitle>{column.title}</CardTitle>
                      </button>
                    )}
                    <div className={styles.columnActions}>
                      {isOwner ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isDeleting}
                            >
                              {uiCopy.board.deleteColumn}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {uiCopy.board.deleteColumnTitle}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {uiCopy.board.deleteColumnDescription}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel type="button">
                                {uiCopy.common.cancel}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                type="button"
                                variant="destructive"
                                onClick={() => handleDeleteColumn(column.id)}
                              >
                                {uiCopy.board.deleteColumn}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <ColumnDropZone id={getColumnDropId(column.id)}>
                  <CardContent className={styles.columnBody}>
                    <SortableContext
                      items={cardsInColumn.map((card) => card.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className={styles.cardList}>
                        {cardsInColumn.map((card, index) => (
                          <React.Fragment key={card.id}>
                            {showPlaceholder && placeholderIndex === index ? (
                              <li
                                className={styles.cardPlaceholder}
                                aria-hidden
                              />
                            ) : null}
                            <SortableCardItem
                              card={card}
                              canEdit={canEdit}
                              dueLabel={uiCopy.board.cardDueDateLabel}
                              formatDueDate={formatDueDate}
                            />
                          </React.Fragment>
                        ))}
                        {showPlaceholder &&
                        placeholderIndex >= cardsInColumn.length ? (
                          <li className={styles.cardPlaceholder} aria-hidden />
                        ) : null}
                      </ul>
                    </SortableContext>
                    {!cardsInColumn.length ? (
                      <p className={styles.cardsEmpty}>{uiCopy.board.noCards}</p>
                    ) : null}
                    {showAddCard ? (
                      <form
                        className={styles.cardForm}
                        onSubmit={(event) => handleCreateCard(event, column.id)}
                      >
                        <Input
                          value={newCardTitleByColumn[column.id] ?? ""}
                          onChange={(event) =>
                            setNewCardTitleByColumn((prev) => ({
                              ...prev,
                              [column.id]: event.target.value,
                            }))
                          }
                          placeholder={uiCopy.board.cardTitlePlaceholder}
                          aria-label={uiCopy.board.cardTitlePlaceholder}
                          disabled={!canEdit || creatingCard}
                        />
                        <Textarea
                          value={newCardDescriptionByColumn[column.id] ?? ""}
                          onChange={(event) =>
                            setNewCardDescriptionByColumn((prev) => ({
                              ...prev,
                              [column.id]: event.target.value,
                            }))
                          }
                          placeholder={uiCopy.board.cardDescriptionPlaceholder}
                          aria-label={uiCopy.board.cardDescriptionPlaceholder}
                          rows={3}
                          disabled={!canEdit || creatingCard}
                        />
                        <div className={styles.cardFormRow}>
                          <Input
                            className={styles.cardDateInput}
                            value={newCardDueByColumn[column.id] ?? ""}
                            onChange={(event) =>
                              setNewCardDueByColumn((prev) => ({
                                ...prev,
                                [column.id]: event.target.value,
                              }))
                            }
                            type="date"
                            aria-label={uiCopy.board.cardDueDateLabel}
                            disabled={!canEdit || creatingCard}
                          />
                          <Button
                            type="submit"
                            disabled={!canEdit || creatingCard}
                          >
                            {creatingCard
                              ? uiCopy.board.creatingCard
                              : uiCopy.board.createCard}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowAddCardByColumn((prev) => ({
                                ...prev,
                                [column.id]: false,
                              }))
                              setNewCardTitleByColumn((prev) => ({
                                ...prev,
                                [column.id]: "",
                              }))
                              setNewCardDescriptionByColumn((prev) => ({
                                ...prev,
                                [column.id]: "",
                              }))
                              setNewCardDueByColumn((prev) => ({
                                ...prev,
                                [column.id]: "",
                              }))
                            }}
                          >
                            {uiCopy.common.cancel}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className={styles.addCardButton}
                        onClick={() =>
                          setShowAddCardByColumn((prev) => ({
                            ...prev,
                            [column.id]: true,
                          }))
                        }
                        disabled={!canEdit}
                      >
                        {uiCopy.board.addCard}
                      </Button>
                    )}
                  </CardContent>
                </ColumnDropZone>
                </Card>
              )
            })
          ) : (
            <p className={styles.empty}>{uiCopy.board.noColumns}</p>
          )}
        </div>
      </DndContext>
    </div>
  )
}
