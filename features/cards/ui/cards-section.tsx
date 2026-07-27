"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import type { DndContextProps } from "@dnd-kit/core"

import type { Board, Column } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { ColumnsGrid } from "@/features/columns/ui/columns-grid"
import { CardDeleteDialog } from "@/features/cards/ui/card-delete-dialog"
import { CardEditDialog } from "@/features/cards/ui/card-edit-dialog"
import { useBoardCards } from "@/features/cards/model/use-board-cards"
import { ColumnsSkeleton } from "@/features/columns/ui/columns-skeleton"
import { useBoardAssignees } from "@/features/cards/model/use-board-assignees"

type CardsSectionProps = {
  boardId: string | null
  board: Board | null
  user: User | null
  canEdit: boolean
  isOwner: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
  columns: Column[]
  isColumnsLoading: boolean
  dndSensors: DndContextProps["sensors"]
  editingId: string | null
  editingTitle: string
  onEditingTitleChange: (value: string) => void
  onStartEditing: (column: Column) => void
  onCancelEditing: () => void
  onCommitEditing: () => void
  updatingColumn: boolean
  deletePendingId: string | null
  onDeleteColumn: (columnId: string) => void
}

export const CardsSection = React.memo(function CardsSection({
  boardId,
  board,
  user,
  canEdit,
  isOwner,
  uiCopy,
  setError,
  columns,
  isColumnsLoading,
  dndSensors,
  editingId,
  editingTitle,
  onEditingTitleChange,
  onStartEditing,
  onCancelEditing,
  onCommitEditing,
  updatingColumn,
  deletePendingId,
  onDeleteColumn,
}: CardsSectionProps) {
  const { assignees, assigneesById, assigneeIds } = useBoardAssignees(
    board,
    user
  )
  const {
    cardsByColumn,
    creatingCard,
    updatingCard,
    deletingCard,
    showAddCardByColumn,
    newCardTitleByColumn,
    newCardDescriptionByColumn,
    newCardDueByColumn,
    newCardAssigneeIdsByColumn,
    toggleAddCard,
    handleCardTitleChange,
    handleCardDescriptionChange,
    handleCardDueChange,
    toggleCardAssignee,
    cancelCreateCard,
    handleCreateCard,
    editingCard,
    editCardOpen,
    handleEditingFieldChange,
    startEditingCard,
    resetEditCard,
    handleUpdateCard,
    toggleEditingAssignee,
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
    isCardsLoading,
    isCardsLimitReached,
  } = useBoardCards({
    boardId,
    user,
    canEdit,
    isOwner,
    uiCopy,
    setError,
    availableAssigneeIds: assigneeIds,
  })

  const showColumnsSkeleton = isColumnsLoading && columns.length === 0
  const contentEditingEnabled = canEdit && !isCardsLimitReached

  return (
    <>
      <CardEditDialog
        open={editCardOpen}
        canEdit={contentEditingEnabled}
        updatingCard={updatingCard}
        uiCopy={uiCopy}
        editingCard={editingCard}
        assignees={assignees}
        onFieldChange={handleEditingFieldChange}
        onToggleAssignee={toggleEditingAssignee}
        onSubmit={handleUpdateCard}
        onClose={resetEditCard}
      />
      <CardDeleteDialog
        open={deleteCardOpen}
        deleteCardTitle={deleteCardTitle}
        isOwner={isOwner && !isCardsLimitReached}
        deletingCard={deletingCard}
        uiCopy={uiCopy}
        onConfirm={handleDeleteCard}
        onClose={resetDeleteCard}
      />
      {isCardsLimitReached ? (
        <p role="alert">{uiCopy.board.cardLimitReached}</p>
      ) : null}
      {showColumnsSkeleton ? (
        <ColumnsSkeleton ariaLabel={uiCopy.common.loading} />
      ) : (
        <ColumnsGrid
          columns={columns}
          cardsByColumn={cardsByColumn}
          canEdit={contentEditingEnabled}
          isOwner={isOwner}
          uiCopy={uiCopy}
          dndSensors={dndSensors}
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
          onEditingTitleChange={onEditingTitleChange}
          onStartEditing={onStartEditing}
          onCancelEditing={onCancelEditing}
          onCommitEditing={onCommitEditing}
          updatingColumn={updatingColumn}
          deletePendingId={deletePendingId}
          onDeleteColumn={onDeleteColumn}
          creatingCard={creatingCard}
          showAddCardByColumn={showAddCardByColumn}
          onToggleAddCard={toggleAddCard}
          newCardTitleByColumn={newCardTitleByColumn}
          onChangeCardTitle={handleCardTitleChange}
          newCardDescriptionByColumn={newCardDescriptionByColumn}
          onChangeCardDescription={handleCardDescriptionChange}
          newCardDueByColumn={newCardDueByColumn}
          newCardAssigneeIdsByColumn={newCardAssigneeIdsByColumn}
          assignees={assignees}
          assigneesById={assigneesById}
          onChangeCardDue={handleCardDueChange}
          onToggleCardAssignee={toggleCardAssignee}
          onCreateCard={handleCreateCard}
          onCancelCreateCard={cancelCreateCard}
          onStartEditingCard={startEditingCard}
          onStartDeletingCard={startDeletingCard}
          formatDueDate={formatDueDate}
          isCardsLoading={isCardsLoading}
        />
      )}
    </>
  )
})
