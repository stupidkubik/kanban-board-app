"use client"

import * as React from "react"

import {
  useCreateBoardLabelMutation,
  useDeleteBoardLabelMutation,
  useGetBoardLabelsQuery,
  useUpdateBoardLabelMutation,
} from "@/features/labels/data/labels-api"
import { BOARD_LABEL_LIMIT } from "@/features/labels/model/label-normalizers"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { BOARD_LABEL_COLORS } from "@/lib/types/boards"
import type {
  BoardLabel,
  BoardLabelColor,
} from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { getErrorMessage } from "@/lib/errors"
import styles from "@/features/labels/ui/labels.module.css"

const labelColorValues: Record<BoardLabelColor, string> = {
  gray: "#64748b",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
}

const getColorLabels = (uiCopy: BoardCopy): Record<BoardLabelColor, string> => ({
  gray: uiCopy.board.labelColorGray,
  red: uiCopy.board.labelColorRed,
  orange: uiCopy.board.labelColorOrange,
  yellow: uiCopy.board.labelColorYellow,
  green: uiCopy.board.labelColorGreen,
  blue: uiCopy.board.labelColorBlue,
  purple: uiCopy.board.labelColorPurple,
  pink: uiCopy.board.labelColorPink,
})

type LabelRowProps = {
  label: BoardLabel
  canEdit: boolean
  pending: boolean
  uiCopy: BoardCopy
  onSave: (label: BoardLabel, name: string, color: BoardLabelColor) => void
  onDelete: (label: BoardLabel) => void
}

const LabelRow = ({
  label,
  canEdit,
  pending,
  uiCopy,
  onSave,
  onDelete,
}: LabelRowProps) => {
  const [name, setName] = React.useState(label.name)
  const [color, setColor] = React.useState(label.color)
  const colorLabels = getColorLabels(uiCopy)

  if (!canEdit) {
    return (
      <li className={styles.labelRow} data-testid={`label-row-${label.id}`}>
        <span>
          <i
            className={styles.swatch}
            style={
              {
                "--label-color": labelColorValues[label.color],
              } as React.CSSProperties
            }
          />
          {label.name}
        </span>
      </li>
    )
  }

  return (
    <li className={styles.labelRow} data-testid={`label-row-${label.id}`}>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={`${uiCopy.board.labelNamePlaceholder}: ${label.name}`}
        disabled={!canEdit || pending}
        maxLength={50}
      />
      <select
        className={styles.colorSelect}
        value={color}
        onChange={(event) => setColor(event.target.value as BoardLabelColor)}
        aria-label={`${uiCopy.board.labelColorLabel}: ${label.name}`}
        disabled={!canEdit || pending}
      >
        {BOARD_LABEL_COLORS.map((value) => (
          <option key={value} value={value}>
            {colorLabels[value]}
          </option>
        ))}
      </select>
      <div className={styles.actions}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => onSave(label, name, color)}
        >
          {uiCopy.board.saveLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => onDelete(label)}
          aria-label={`${uiCopy.board.deleteLabel}: ${label.name}`}
        >
          {uiCopy.board.deleteLabel}
        </Button>
      </div>
    </li>
  )
}

type LabelsSectionProps = {
  boardId: string
  canEdit: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

export const LabelsSection = ({
  boardId,
  canEdit,
  uiCopy,
  setError,
}: LabelsSectionProps) => {
  const { data: labels = [] } = useGetBoardLabelsQuery(boardId)
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState<BoardLabelColor>("blue")
  const [deleteTarget, setDeleteTarget] = React.useState<BoardLabel | null>(null)
  const [createLabel, { isLoading: creating }] =
    useCreateBoardLabelMutation()
  const [updateLabel, { isLoading: updating }] =
    useUpdateBoardLabelMutation()
  const [deleteLabel, { isLoading: deleting }] =
    useDeleteBoardLabelMutation()
  const pending = creating || updating || deleting
  const colorLabels = getColorLabels(uiCopy)

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      setError(uiCopy.board.errors.labelNameRequired)
      return
    }
    setError(null)
    try {
      await createLabel({ boardId, name: nextName, color }).unwrap()
      setName("")
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.createLabelFailed))
    }
  }

  const handleSave = async (
    label: BoardLabel,
    nextName: string,
    nextColor: BoardLabelColor
  ) => {
    if (!nextName.trim()) {
      setError(uiCopy.board.errors.labelNameRequired)
      return
    }
    setError(null)
    try {
      await updateLabel({
        boardId,
        labelId: label.id,
        name: nextName,
        color: nextColor,
      }).unwrap()
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.updateLabelFailed))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setError(null)
    try {
      await deleteLabel({ boardId, labelId: deleteTarget.id }).unwrap()
      setDeleteTarget(null)
    } catch (error) {
      setError(getErrorMessage(error, uiCopy.board.errors.deleteLabelFailed))
    }
  }

  const atLimit = labels.length >= BOARD_LABEL_LIMIT
  return (
    <>
      <Card className={styles.catalog} data-testid="labels-section">
        <CardHeader className={styles.header}>
          <div>
            <CardTitle>{uiCopy.board.labelsTitle}</CardTitle>
            <CardDescription className={styles.description}>
              {uiCopy.board.labelsDescription}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <form className={styles.createForm} onSubmit={handleCreate}>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={uiCopy.board.labelNamePlaceholder}
                aria-label={uiCopy.board.labelNamePlaceholder}
                maxLength={50}
                disabled={pending || atLimit}
                data-testid="new-label-name"
              />
              <select
                className={styles.colorSelect}
                value={color}
                onChange={(event) =>
                  setColor(event.target.value as BoardLabelColor)
                }
                aria-label={uiCopy.board.labelColorLabel}
                disabled={pending || atLimit}
                data-testid="new-label-color"
              >
                {BOARD_LABEL_COLORS.map((value) => (
                  <option key={value} value={value}>
                    {colorLabels[value]}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                size="sm"
                disabled={pending || atLimit}
                data-testid="create-label"
              >
                {creating ? <Spinner size="sm" aria-hidden="true" /> : null}
                {creating
                  ? uiCopy.board.creatingLabel
                  : uiCopy.board.createLabel}
              </Button>
            </form>
          ) : null}
          {atLimit ? <p className={styles.limit}>{uiCopy.board.labelLimitReached}</p> : null}
          {labels.length ? (
            <ul className={styles.list}>
              {labels.map((label) => (
                <LabelRow
                  key={`${label.id}-${label.updatedAt ?? 0}`}
                  label={label}
                  canEdit={canEdit}
                  pending={pending}
                  uiCopy={uiCopy}
                  onSave={handleSave}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{uiCopy.board.labelEmpty}</p>
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{uiCopy.board.deleteLabelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {uiCopy.board.deleteLabelDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {uiCopy.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              data-testid="delete-label-confirm"
            >
              {uiCopy.board.deleteLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
