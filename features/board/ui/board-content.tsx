"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"

import type { Board } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import type { Locale } from "@/lib/i18n"
import { BoardStatus } from "@/features/board/ui/board-status"
import { useBoardColumns } from "@/features/columns/model/use-board-columns"
import { HeaderSection } from "@/features/columns/ui/header-section"
import { CardsSection } from "@/features/cards/ui/cards-section"
import { ParticipantsSection } from "@/features/participants/ui/participants-section"

type BoardContentProps = {
  boardId: string
  board: Board | null
  user: User | null
  boardTitle: string
  canEdit: boolean
  isOwner: boolean
  isViewer: boolean
  uiCopy: BoardCopy
  uiLocale: Locale
}

export const BoardContent = React.memo(function BoardContent({
  boardId,
  board,
  user,
  boardTitle,
  canEdit,
  isOwner,
  isViewer,
  uiCopy,
  uiLocale,
}: BoardContentProps) {
  const [error, setError] = React.useState<string | null>(null)
  const {
    columns,
    showAddColumn,
    newColumnTitle,
    setNewColumnTitle,
    setShowAddColumn,
    creatingColumn,
    editingId,
    editingTitle,
    setEditingTitle,
    startEditing,
    cancelEditing,
    commitEditing,
    updatingColumn,
    deletePendingId,
    handleCreateColumn,
    handleDeleteColumn,
  } = useBoardColumns({
    boardId,
    user,
    canEdit,
    uiCopy,
    setError,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <>
      <HeaderSection
        uiCopy={uiCopy}
        boardTitle={boardTitle}
        canEdit={canEdit}
        isViewer={isViewer}
        showAddColumn={showAddColumn}
        creatingColumn={creatingColumn}
        newColumnTitle={newColumnTitle}
        onNewColumnTitleChange={setNewColumnTitle}
        onToggleAddColumn={setShowAddColumn}
        onCreateColumn={handleCreateColumn}
      />
      <BoardStatus error={error} />
      <ParticipantsSection
        boardId={boardId}
        board={board}
        user={user}
        isOwner={isOwner}
        uiCopy={uiCopy}
        uiLocale={uiLocale}
        setError={setError}
      />
      <CardsSection
        boardId={boardId}
        user={user}
        canEdit={canEdit}
        isOwner={isOwner}
        uiCopy={uiCopy}
        uiLocale={uiLocale}
        setError={setError}
        columns={columns}
        dndSensors={sensors}
        editingId={editingId}
        editingTitle={editingTitle}
        onEditingTitleChange={setEditingTitle}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onCommitEditing={commitEditing}
        updatingColumn={updatingColumn}
        deletePendingId={deletePendingId}
        onDeleteColumn={handleDeleteColumn}
      />
    </>
  )
})
