"use client"

import * as React from "react"

import {
  useCreateBoardLabelMutation,
  useDeleteBoardLabelMutation,
  useGetBoardLabelsQuery,
  useUpdateBoardLabelMutation,
} from "@/features/labels/data/labels-api"
import { BOARD_LABEL_LIMIT } from "@/features/labels/model/label-normalizers"
import { getErrorMessage } from "@/lib/errors"
import type { BoardLabel, BoardLabelColor } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"

type UseLabelManagerOptions = {
  boardId: string
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

export function useLabelManager({ boardId, uiCopy, setError }: UseLabelManagerOptions) {
  const { data: labels = [] } = useGetBoardLabelsQuery(boardId)
  const [createLabel] = useCreateBoardLabelMutation()
  const [updateLabel] = useUpdateBoardLabelMutation()
  const [deleteLabel] = useDeleteBoardLabelMutation()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createColor, setCreateColor] = React.useState<BoardLabelColor>("blue")
  const [editingLabel, setEditingLabel] = React.useState<BoardLabel | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editColor, setEditColor] = React.useState<BoardLabelColor>("blue")
  const [deleteTarget, setDeleteTarget] = React.useState<BoardLabel | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [pendingLabelId, setPendingLabelId] = React.useState<string | null>(null)

  const openCreate = React.useCallback(() => {
    setError(null)
    setCreateOpen(true)
  }, [setError])

  const cancelCreate = React.useCallback(() => {
    setCreateOpen(false)
    setCreateName("")
    setCreateColor("blue")
  }, [])

  const startEdit = React.useCallback((label: BoardLabel) => {
    setError(null)
    setEditingLabel(label)
    setEditName(label.name)
    setEditColor(label.color)
  }, [setError])

  const cancelEdit = React.useCallback(() => {
    setEditingLabel(null)
    setEditName("")
    setEditColor("blue")
  }, [])

  const submitCreate = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = createName.trim()
    if (!name) {
      setError(uiCopy.board.errors.labelNameRequired)
      return
    }
    setError(null)
    setCreating(true)
    try {
      await createLabel({ boardId, name, color: createColor }).unwrap()
      cancelCreate()
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.createLabelFailed))
    } finally {
      setCreating(false)
    }
  }, [boardId, cancelCreate, createColor, createLabel, createName, setError, uiCopy.board.errors.createLabelFailed, uiCopy.board.errors.labelNameRequired])

  const submitEdit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingLabel) return
    const name = editName.trim()
    if (!name) {
      setError(uiCopy.board.errors.labelNameRequired)
      return
    }
    setError(null)
    setPendingLabelId(editingLabel.id)
    try {
      await updateLabel({ boardId, labelId: editingLabel.id, name, color: editColor }).unwrap()
      cancelEdit()
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.updateLabelFailed))
    } finally {
      setPendingLabelId(null)
    }
  }, [boardId, cancelEdit, editColor, editName, editingLabel, setError, uiCopy.board.errors.labelNameRequired, uiCopy.board.errors.updateLabelFailed, updateLabel])

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    setError(null)
    setPendingLabelId(deleteTarget.id)
    try {
      await deleteLabel({ boardId, labelId: deleteTarget.id }).unwrap()
      setDeleteTarget(null)
      if (editingLabel?.id === deleteTarget.id) cancelEdit()
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.deleteLabelFailed))
    } finally {
      setPendingLabelId(null)
    }
  }, [boardId, cancelEdit, deleteLabel, deleteTarget, editingLabel, setError, uiCopy.board.errors.deleteLabelFailed])

  return {
    labels,
    atLimit: labels.length >= BOARD_LABEL_LIMIT,
    createOpen,
    createName,
    createColor,
    editingLabel,
    editName,
    editColor,
    deleteTarget,
    creating,
    pendingLabelId,
    createDirty: Boolean(createName.trim()),
    editDirty: Boolean(editingLabel && (editName.trim() !== editingLabel.name || editColor !== editingLabel.color)),
    openCreate,
    cancelCreate,
    startEdit,
    cancelEdit,
    submitCreate,
    submitEdit,
    confirmDelete,
    setCreateName,
    setCreateColor,
    setEditName,
    setEditColor,
    setDeleteTarget,
  }
}
