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
import { BoardHeader } from "@/features/board/ui/board-header"
import { BoardToolbar } from "@/features/board/ui/board-toolbar"
import { CardsSection } from "@/features/cards/ui/cards-section"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import { useUpdateBoardLanguageMutation } from "@/features/boards/data/boards-api"
import { getErrorMessage } from "@/lib/errors"
import styles from "@/features/board/ui/board-page.module.css"

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
    <div className={styles.boardContent}>
      <div className={styles.stickyShell}>
      <BoardHeader
        uiCopy={uiCopy}
        boardId={boardId}
        boardTitle={boardTitle}
        isViewer={isViewer}
      />
      <BoardToolbar
        boardId={boardId}
        board={board}
        user={user}
        canEdit={canEdit}
        isOwner={isOwner}
        uiCopy={uiCopy}
        uiLocale={uiLocale}
        onUiLocaleChange={onUiLocaleChange}
        boardLanguage={board?.language ?? uiLocale}
        updatingBoardLanguage={updatingBoardLanguage}
        onBoardLanguageChange={handleBoardLanguageChange}
        creatingColumn={creatingColumn}
        newColumnTitle={newColumnTitle}
        onNewColumnTitleChange={setNewColumnTitle}
        onCreateColumn={handleCreateColumn}
        setError={setError}
      />
      </div>
      <BoardStatus error={error} />
      <CardsSection
        boardId={boardId}
        board={board}
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
    </div>
  )
})
