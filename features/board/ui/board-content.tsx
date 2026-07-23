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

import type { Board, BoardLanguage } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { type Locale } from "@/lib/i18n"
import { BoardStatus } from "@/features/board/ui/board-status"
import { useBoardColumns } from "@/features/columns/model/use-board-columns"
import { HeaderSection } from "@/features/columns/ui/header-section"
import { CardsSection } from "@/features/cards/ui/cards-section"
import { ParticipantsSection } from "@/features/participants/ui/participants-section"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import { useUpdateBoardLanguageMutation } from "@/lib/store/firestore-api"
import { getErrorMessage } from "@/lib/errors"

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
  onUiLocaleChange: (locale: Locale) => void
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
  onUiLocaleChange,
}: BoardContentProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [updateBoardLanguage, { isLoading: updatingBoardLanguage }] =
    useUpdateBoardLanguageMutation()
  const { notifyError } = useNotifications()
  const {
    columns,
    isColumnsLoading,
    newColumnTitle,
    setNewColumnTitle,
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

  React.useEffect(() => {
    if (error) {
      notifyError(error)
    }
  }, [error, notifyError])

  const handleBoardLanguageChange = React.useCallback(
    async (language: BoardLanguage) => {
      if (!canEdit) {
        return
      }
      setError(null)
      try {
        await updateBoardLanguage({ boardId, language }).unwrap()
      } catch (err) {
        setError(getErrorMessage(err, uiCopy.board.errors.updateLanguageFailed))
      }
    },
    [boardId, canEdit, uiCopy.board.errors.updateLanguageFailed, updateBoardLanguage]
  )

  return (
    <>
      <HeaderSection
        uiCopy={uiCopy}
        boardId={boardId}
        boardTitle={boardTitle}
        isViewer={isViewer}
        boardLanguage={board?.language ?? uiLocale}
        canEdit={canEdit}
        updatingBoardLanguage={updatingBoardLanguage}
        onBoardLanguageChange={handleBoardLanguageChange}
        uiLocale={uiLocale}
        onUiLocaleChange={onUiLocaleChange}
      />
      <BoardStatus error={error} />
      <ParticipantsSection
        boardId={boardId}
        board={board}
        user={user}
        isOwner={isOwner}
        canEdit={canEdit}
        creatingColumn={creatingColumn}
        newColumnTitle={newColumnTitle}
        onNewColumnTitleChange={setNewColumnTitle}
        onCreateColumn={handleCreateColumn}
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
        setError={setError}
        columns={columns}
        isColumnsLoading={isColumnsLoading}
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
