"use client"

import * as React from "react"
import type { User } from "firebase/auth"

import { doc, serverTimestamp, setDoc } from "firebase/firestore"

import {
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useGetColumnsQuery,
  useUpdateColumnMutation,
} from "@/lib/store/firestore-api"
import { clientDb } from "@/lib/firebase/client"
import type { Column } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { isNonEmpty } from "@/lib/validation"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"

type UseBoardColumnsParams = {
  boardId: string | null
  user: User | null
  canEdit: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

type UseBoardColumnsResult = {
  columns: Column[]
  isColumnsLoading: boolean
  newColumnTitle: string
  setNewColumnTitle: (value: string) => void
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
  const [newColumnTitle, setNewColumnTitle] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState("")
  const [deletePendingId, setDeletePendingId] = React.useState<string | null>(null)
  const { notify, notifySuccess } = useNotifications()

  const {
    data: columns = [],
    isLoading: isColumnsLoading,
    isFetching: isColumnsFetching,
  } = useGetColumnsQuery(boardId ?? null, {
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
    const snapshot = columns.find((column) => column.id === columnId) ?? null

    try {
      await deleteColumn({ boardId, columnId }).unwrap()
      if (snapshot) {
        notify({
          message: uiCopy.board.columnDeletedToast,
          variant: "success",
          actionLabel: uiCopy.common.undo,
          onAction: async () => {
            try {
              await setDoc(doc(clientDb, "boards", boardId, "columns", snapshot.id), {
                title: snapshot.title,
                order: snapshot.order,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
              notifySuccess(uiCopy.board.columnRestoredToast)
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : uiCopy.board.errors.createColumnFailed
              )
            }
          },
        })
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy.board.errors.deleteColumnFailed
      )
    } finally {
      setDeletePendingId(null)
    }
  }, [
    boardId,
    columns,
    deleteColumn,
    notify,
    notifySuccess,
    setError,
    uiCopy.board.columnDeletedToast,
    uiCopy.board.columnRestoredToast,
    uiCopy.board.errors.createColumnFailed,
    uiCopy.board.errors.deleteColumnFailed,
    uiCopy.common.undo,
  ])

  return {
    columns,
    isColumnsLoading: isColumnsLoading || isColumnsFetching,
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
  }
}
