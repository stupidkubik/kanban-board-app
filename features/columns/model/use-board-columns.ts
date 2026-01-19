"use client"

import * as React from "react"
import type { User } from "firebase/auth"

import {
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useGetColumnsQuery,
  useUpdateColumnMutation,
} from "@/lib/store/firestore-api"
import type { Column } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { isNonEmpty } from "@/lib/validation"

type UseBoardColumnsParams = {
  boardId: string | null
  user: User | null
  canEdit: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

type UseBoardColumnsResult = {
  columns: Column[]
  showAddColumn: boolean
  newColumnTitle: string
  setNewColumnTitle: (value: string) => void
  setShowAddColumn: (value: boolean) => void
  creatingColumn: boolean
  editingId: string | null
  editingTitle: string
  setEditingTitle: (value: string) => void
  startEditing: (column: Column) => void
  cancelEditing: () => void
  commitEditing: () => void
  updatingColumn: boolean
  deletePendingId: string | null
  handleCreateColumn: (event: React.FormEvent<HTMLFormElement>) => void
  handleDeleteColumn: (columnId: string) => void
}

export function useBoardColumns({
  boardId,
  user,
  canEdit,
  uiCopy,
  setError,
}: UseBoardColumnsParams): UseBoardColumnsResult {
  const [showAddColumn, setShowAddColumn] = React.useState(false)
  const [newColumnTitle, setNewColumnTitle] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState("")
  const [deletePendingId, setDeletePendingId] = React.useState<string | null>(null)

  const { data: columns = [] } = useGetColumnsQuery(boardId ?? null, {
    skip: !boardId,
  })
  const [createColumn, { isLoading: creatingColumn }] =
    useCreateColumnMutation()
  const [updateColumn, { isLoading: updatingColumn }] =
    useUpdateColumnMutation()
  const [deleteColumn] = useDeleteColumnMutation()

  const handleCreateColumn = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!boardId || !user || !canEdit) {
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
    canEdit,
    createColumn,
    newColumnTitle,
    setError,
    uiCopy.board.errors.columnTitleRequired,
    uiCopy.board.errors.createColumnFailed,
    user,
  ])

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
    editingId,
    editingTitle,
    cancelEditing,
    setError,
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
  }, [boardId, deleteColumn, setError, uiCopy.board.errors.deleteColumnFailed])

  return {
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
  }
}
