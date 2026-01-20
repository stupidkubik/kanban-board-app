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
import type { Card as BoardCard, Column } from "@/lib/types/boards"

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
  isCardsLoading: boolean
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
  isCardsLoading,
}: ColumnsGridProps) {
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
            const showAddCard =
              canEdit && (showAddCardByColumn[column.id] ?? false)
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
                <ColumnDropZone
                  id={getColumnDropId(column.id)}
                  testId={`column-drop-${column.id}`}
                >
                  <CardContent className={styles.columnBody}>
                    <CardsColumnBody
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
                      showAddCard={showAddCard}
                      creatingCard={creatingCard}
                      newCardTitle={newCardTitleByColumn[column.id] ?? ""}
                      newCardDescription={newCardDescriptionByColumn[column.id] ?? ""}
                      newCardDue={newCardDueByColumn[column.id] ?? ""}
                      onChangeCardTitle={(value) => onChangeCardTitle(column.id, value)}
                      onChangeCardDescription={(value) =>
                        onChangeCardDescription(column.id, value)
                      }
                      onChangeCardDue={(value) => onChangeCardDue(column.id, value)}
                      onCreateCard={(event) => onCreateCard(event, column.id)}
                      onCancelCreateCard={() => onCancelCreateCard(column.id)}
                      onToggleAddCard={(open) => onToggleAddCard(column.id, open)}
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
    </DndContext>
  )
})
