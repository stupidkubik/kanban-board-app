"use client"

import * as React from "react"
import {
  DndContext,
  type DndContextProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { getCopy } from "@/lib/i18n"
import { getColumnDropId } from "@/lib/board-dnd"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import styles from "@/components/board-page.module.css"
import type { Card as BoardCard, Column } from "@/lib/types/boards"

type DragCardData = { columnId?: string }

type SortableCardItemProps = {
  card: BoardCard
  canEdit: boolean
  canDelete: boolean
  onEdit: (card: BoardCard) => void
  onDelete: (card: BoardCard) => void
  deleteLabel: string
  dueLabel: string
  formatDueDate: (value?: number) => string | null
}

const SortableCardItem = ({
  card,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  deleteLabel,
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
      onClick={() => {
        if (canEdit && !isDragging) {
          onEdit(card)
        }
      }}
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : -1}
      onKeyDown={(event) => {
        if (!canEdit || isDragging) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onEdit(card)
        }
      }}
    >
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardTitle}>{card.title}</div>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={styles.cardActionButton}
            aria-label={deleteLabel}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(card)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6a1 1 0 0 1 .993.883L16 4v1h4a1 1 0 0 1 .117 1.993L20 7h-1.07l-.76 11.403A2 2 0 0 1 16.175 20H7.825a2 2 0 0 1-1.995-1.597L5.07 7H4a1 1 0 0 1-.117-1.993L4 5h4V4a1 1 0 0 1 1-1Zm6 2H9v1h6V5Zm-2 4a1 1 0 0 1 .993.883L14 10v6a1 1 0 0 1-1.993.117L12 16v-6a1 1 0 0 1 1-1Zm-4 0a1 1 0 0 1 .993.883L10 10v6a1 1 0 0 1-1.993.117L8 16v-6a1 1 0 0 1 1-1Z" />
            </svg>
          </Button>
        ) : null}
      </div>
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

type ColumnsGridProps = {
  columns: Column[]
  cardsByColumn: Map<string, BoardCard[]>
  canEdit: boolean
  isOwner: boolean
  uiCopy: ReturnType<typeof getCopy>
  dndSensors: DndContextProps["sensors"]
  hoveredColumnId: string | null
  activeCardId: string | null
  activeCardColumnId: string | null
  overCardId: string | null
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel: () => void
  editingId: string | null
  editingTitle: string
  onEditingTitleChange: (value: string) => void
  onStartEditing: (column: Column) => void
  onCancelEditing: () => void
  onCommitEditing: () => void
  updatingColumn: boolean
  deletePendingId: string | null
  onDeleteColumn: (columnId: string) => void
  creatingCard: boolean
  showAddCardByColumn: Record<string, boolean>
  onToggleAddCard: (columnId: string, open: boolean) => void
  newCardTitleByColumn: Record<string, string>
  onChangeCardTitle: (columnId: string, value: string) => void
  newCardDescriptionByColumn: Record<string, string>
  onChangeCardDescription: (columnId: string, value: string) => void
  newCardDueByColumn: Record<string, string>
  onChangeCardDue: (columnId: string, value: string) => void
  onCreateCard: (event: React.FormEvent<HTMLFormElement>, columnId: string) => void
  onCancelCreateCard: (columnId: string) => void
  onStartEditingCard: (card: BoardCard) => void
  onStartDeletingCard: (card: BoardCard) => void
  formatDueDate: (value?: number) => string | null
}

export const ColumnsGrid = React.memo(function ColumnsGrid({
  columns,
  cardsByColumn,
  canEdit,
  isOwner,
  uiCopy,
  dndSensors,
  hoveredColumnId,
  activeCardId,
  activeCardColumnId,
  overCardId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  editingId,
  editingTitle,
  onEditingTitleChange,
  onStartEditing,
  onCancelEditing,
  onCommitEditing,
  updatingColumn,
  deletePendingId,
  onDeleteColumn,
  creatingCard,
  showAddCardByColumn,
  onToggleAddCard,
  newCardTitleByColumn,
  onChangeCardTitle,
  newCardDescriptionByColumn,
  onChangeCardDescription,
  newCardDueByColumn,
  onChangeCardDue,
  onCreateCard,
  onCancelCreateCard,
  onStartEditingCard,
  onStartDeletingCard,
  formatDueDate,
}: ColumnsGridProps) {
  const dueLabel = uiCopy.board.cardDueDateLabel

  return (
    <DndContext
      sensors={dndSensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className={styles.columnsGrid}>
        {columns.length ? (
          columns.map((column) => {
            const isEditing = editingId === column.id
            const isDeleting = deletePendingId === column.id
            const cardsInColumn = cardsByColumn.get(column.id) ?? []
            const showAddCard =
              canEdit && (showAddCardByColumn[column.id] ?? false)
            const isDropTarget = hoveredColumnId === column.id
            const showPlaceholder =
              !!activeCardId && !!activeCardColumnId && isDropTarget
            // Compute where to render the drop placeholder so the list height stays stable.
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
                        onChange={(event) => onEditingTitleChange(event.target.value)}
                        onBlur={onCommitEditing}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            onCommitEditing()
                          }
                          if (event.key === "Escape") {
                            event.preventDefault()
                            onCancelEditing()
                          }
                        }}
                        disabled={!canEdit || updatingColumn}
                        autoFocus
                      />
                    ) : canEdit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={styles.columnTitleButton}
                        type="button"
                        onClick={() => onStartEditing(column)}
                        disabled={!canEdit}
                      >
                        <CardTitle>{column.title}</CardTitle>
                      </Button>
                    ) : (
                      <CardTitle>{column.title}</CardTitle>
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
                                onClick={() => onDeleteColumn(column.id)}
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
                              canDelete={isOwner}
                              onEdit={onStartEditingCard}
                              onDelete={onStartDeletingCard}
                              deleteLabel={uiCopy.board.deleteCard}
                              dueLabel={dueLabel}
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
                        onSubmit={(event) => onCreateCard(event, column.id)}
                      >
                        <Input
                          value={newCardTitleByColumn[column.id] ?? ""}
                          onChange={(event) =>
                            onChangeCardTitle(column.id, event.target.value)
                          }
                          placeholder={uiCopy.board.cardTitlePlaceholder}
                          aria-label={uiCopy.board.cardTitlePlaceholder}
                          disabled={!canEdit || creatingCard}
                        />
                        <Textarea
                          value={newCardDescriptionByColumn[column.id] ?? ""}
                          onChange={(event) =>
                            onChangeCardDescription(column.id, event.target.value)
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
                              onChangeCardDue(column.id, event.target.value)
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
                            onClick={() => onCancelCreateCard(column.id)}
                          >
                            {uiCopy.common.cancel}
                          </Button>
                        </div>
                      </form>
                    ) : canEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className={styles.addCardButton}
                        onClick={() => onToggleAddCard(column.id, true)}
                      >
                        {uiCopy.board.addCard}
                      </Button>
                    ) : null}
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
  )
})
