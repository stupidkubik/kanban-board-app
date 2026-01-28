"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import type { DndContextProps } from "@dnd-kit/core"

import type { Column } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { ColumnsGrid } from "@/features/columns/ui/columns-grid"
import { CardDeleteDialog } from "@/features/cards/ui/card-delete-dialog"
import { CardEditDialog } from "@/features/cards/ui/card-edit-dialog"
import { useBoardCards } from "@/features/cards/model/use-board-cards"
import { ColumnsSkeleton } from "@/features/columns/ui/columns-skeleton"

type CardsSectionProps = {
  boardId: string | null
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
  const {
    cardsByColumn,
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
    isCardsLoading,
  } = useBoardCards({
    boardId,
    user,
    canEdit,
    isOwner,
    uiCopy,
    setError,
  })

  const showColumnsSkeleton = isColumnsLoading && columns.length === 0

  return (
    <>
      <CardEditDialog
        open={editCardOpen}
        canEdit={canEdit}
        updatingCard={updatingCard}
        uiCopy={uiCopy}
        editingCard={editingCard}
        onFieldChange={handleEditingFieldChange}
        onSubmit={handleUpdateCard}
        onClose={resetEditCard}
      />
      <CardDeleteDialog
        open={deleteCardOpen}
        deleteCardTitle={deleteCardTitle}
        isOwner={isOwner}
        deletingCard={deletingCard}
        uiCopy={uiCopy}
        onConfirm={handleDeleteCard}
        onClose={resetDeleteCard}
      />
      {showColumnsSkeleton ? (
        <ColumnsSkeleton ariaLabel={uiCopy.common.loading} />
      ) : (
        <ColumnsGrid
          columns={columns}
          cardsByColumn={cardsByColumn}
          canEdit={canEdit}
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
          onChangeCardDue={handleCardDueChange}
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
