"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  type DndContextProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core"
import { TrashSimple } from "@phosphor-icons/react"

import { getCopy } from "@/lib/i18n"
import { getColumnDropId } from "@/lib/board-dnd"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { CardsColumnBody } from "@/features/cards/ui/cards-column-body"
import styles from "@/features/board/ui/board-page.module.css"
import cardStyles from "@/features/cards/ui/cards.module.css"
import type {
  BoardLabel,
  Card as BoardCard,
  Column,
} from "@/lib/types/boards"
import type { CardAssignee } from "@/lib/types/board-ui"

const isOverdueDate = (value?: number) => {
  if (!value) {
    return false
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return value < today.getTime()
}

type ColumnDropZoneProps = {
  id: string
  testId?: string
  children: React.ReactNode
}

const ColumnDropZone = ({ id, testId, children }: ColumnDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={
        isOver ? `${styles.columnDropZone} ${styles.columnDropZoneOver}` : styles.columnDropZone
      }
      data-testid={testId}
      data-drop-active={isOver ? "true" : "false"}
    >
      {children}
    </div>
  )
}

type ColumnsGridProps = {
  boardId: string | null
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
  onToggleAddCard: (columnId: string, open: boolean) => void
  onChangeCardTitle: (columnId: string, value: string) => void
  onChangeCardDescription: (columnId: string, value: string) => void
  assignees: CardAssignee[]
  assigneesById: Map<string, CardAssignee>
  labels: BoardLabel[]
  labelsById: Map<string, BoardLabel>
  onChangeCardDue: (columnId: string, value: string) => void
  onToggleCardAssignee: (columnId: string, assigneeId: string) => void
  onToggleCardLabel: (columnId: string, labelId: string) => void
  onCreateCard: (event: React.FormEvent<HTMLFormElement>, columnId: string) => void
  onCancelCreateCard: (columnId: string) => void
  onStartEditingCard: (card: BoardCard) => void
  onStartDeletingCard: (card: BoardCard) => void
  formatDueDate: (value?: number) => string | null
  isCardsLoading: boolean
}

export const ColumnsGrid = React.memo(function ColumnsGrid({
  boardId,
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
  onToggleAddCard,
  onChangeCardTitle,
  onChangeCardDescription,
  assignees,
  assigneesById,
  labels,
  labelsById,
  onChangeCardDue,
  onToggleCardAssignee,
  onToggleCardLabel,
  onCreateCard,
  onCancelCreateCard,
  onStartEditingCard,
  onStartDeletingCard,
  formatDueDate,
  isCardsLoading,
}: ColumnsGridProps) {
  const activeCard = React.useMemo(() => {
    if (!activeCardId) {
      return null
    }
    for (const columnCards of cardsByColumn.values()) {
      const match = columnCards.find((card) => card.id === activeCardId)
      if (match) {
        return match
      }
    }
    return null
  }, [activeCardId, cardsByColumn])
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
      <div className={styles.columnsGrid} aria-busy={isCardsLoading}>
        {columns.length ? (
          columns.map((column) => {
            const isEditing = editingId === column.id
            const isDeleting = deletePendingId === column.id
            const cardsInColumn = cardsByColumn.get(column.id) ?? []
            const isDropTarget = hoveredColumnId === column.id

            return (
              <Card
                key={column.id}
                className={
                  isDropTarget
                    ? `${styles.columnCard} ${styles.columnCardDropActive}`
                    : styles.columnCard
                }
                data-testid={`column-${column.id}`}
                data-column-title={column.title}
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
                        <CardTitle className={styles.columnTitle}>
                          {column.title}
                        </CardTitle>
                      </Button>
                    ) : (
                      <CardTitle className={styles.columnTitle}>{column.title}</CardTitle>
                    )}
                    <div className={styles.columnActions}>
                      {isOwner ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={styles.columnDeleteButton}
                              disabled={isDeleting}
                              aria-label={uiCopy.board.deleteColumn}
                            >
                              <TrashSimple weight="bold" />
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
                <ColumnDropZone
                  id={getColumnDropId(column.id)}
                  testId={`column-drop-${column.id}`}
                >
                  <CardContent className={styles.columnBody}>
                    <CardsColumnBody
                      boardId={boardId}
                      columnId={column.id}
                      cards={cardsInColumn}
                      canEdit={canEdit}
                      canDelete={isOwner}
                      uiCopy={uiCopy}
                      isLoading={isCardsLoading}
                      activeCardId={activeCardId}
                      activeCardColumnId={activeCardColumnId}
                      hoveredColumnId={hoveredColumnId}
                      overCardId={overCardId}
                      creatingCard={creatingCard}
                      assignees={assignees}
                      assigneesById={assigneesById}
                      labels={labels}
                      labelsById={labelsById}
                      onChangeCardTitle={onChangeCardTitle}
                      onChangeCardDescription={onChangeCardDescription}
                      onChangeCardDue={onChangeCardDue}
                      onToggleCardAssignee={onToggleCardAssignee}
                      onToggleCardLabel={onToggleCardLabel}
                      onCreateCard={onCreateCard}
                      onCancelCreateCard={onCancelCreateCard}
                      onToggleAddCard={onToggleAddCard}
                      onStartEditingCard={onStartEditingCard}
                      onStartDeletingCard={onStartDeletingCard}
                      formatDueDate={formatDueDate}
                    />
                  </CardContent>
                </ColumnDropZone>
              </Card>
            )
          })
        ) : (
          <p className={styles.empty}>{uiCopy.board.noColumns}</p>
        )}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div
            className={[
              cardStyles.cardItem,
              cardStyles.cardDragOverlay,
              isOverdueDate(activeCard.dueAt) ? cardStyles.cardItemOverdue : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-testid="card-drag-overlay"
          >
            <div className={cardStyles.cardHeaderRow}>
              <div className={cardStyles.cardTitle}>{activeCard.title}</div>
            </div>
            {activeCard.description ? (
              <div className={cardStyles.cardDescription}>
                {activeCard.description}
              </div>
            ) : null}
            {activeCard.dueAt ? (
              <div className={cardStyles.cardMeta}>
                {dueLabel}: {formatDueDate(activeCard.dueAt)}
              </div>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
})
