"use client"

import * as React from "react"

import { type BoardCopy, type EditingCardDraft } from "@/lib/types/board-ui"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import styles from "@/features/cards/ui/cards.module.css"
import type { CardAssignee } from "@/lib/types/board-ui"
import { CardAssigneePicker } from "@/features/cards/ui/card-assignee-picker"
import { CardLabelPicker } from "@/features/labels/ui/card-label-picker"
import type { BoardLabel } from "@/lib/types/boards"

type CardEditDialogProps = {
  open: boolean
  canEdit: boolean
  updatingCard: boolean
  uiCopy: BoardCopy
  editingCard: EditingCardDraft
  assignees: CardAssignee[]
  labels: BoardLabel[]
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: "title" | "description" | "due", value: string) => void
  onToggleAssignee: (assigneeId: string) => void
  onToggleLabel: (labelId: string) => void
  onClose: () => void
}

export function CardEditDialog({
  open,
  canEdit,
  updatingCard,
  uiCopy,
  editingCard,
  assignees,
  labels,
  onSubmit,
  onFieldChange,
  onToggleAssignee,
  onToggleLabel,
  onClose,
}: CardEditDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{uiCopy.board.editCardTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {uiCopy.board.editCardDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className={styles.cardForm} onSubmit={onSubmit}>
          <Field>
            <FieldLabel className="srOnly" htmlFor="edit-card-title">
              {uiCopy.board.cardTitlePlaceholder}
            </FieldLabel>
            <FieldContent>
              <Input
                id="edit-card-title"
                className={styles.cardFormInput}
                value={editingCard.title}
                onChange={(event) => onFieldChange("title", event.target.value)}
                placeholder={uiCopy.board.cardTitlePlaceholder}
                aria-label={uiCopy.board.cardTitlePlaceholder}
                disabled={!canEdit || updatingCard}
                autoFocus
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel className="srOnly" htmlFor="edit-card-description">
              {uiCopy.board.cardDescriptionPlaceholder}
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="edit-card-description"
                className={styles.cardFormTextarea}
                value={editingCard.description}
                onChange={(event) => onFieldChange("description", event.target.value)}
                placeholder={uiCopy.board.cardDescriptionPlaceholder}
                aria-label={uiCopy.board.cardDescriptionPlaceholder}
                rows={4}
                disabled={!canEdit || updatingCard}
              />
            </FieldContent>
          </Field>
          <div className={styles.cardFormRow}>
            <Label className="srOnly" htmlFor="edit-card-due">
              {uiCopy.board.cardDueDateLabel}
            </Label>
            <Input
              id="edit-card-due"
              className={`${styles.cardDateInput} ${styles.cardFormInput}`}
              value={editingCard.due}
              onChange={(event) => onFieldChange("due", event.target.value)}
              type="date"
              aria-label={uiCopy.board.cardDueDateLabel}
              disabled={!canEdit || updatingCard}
            />
          </div>
          <CardAssigneePicker
            assignees={assignees}
            selectedIds={editingCard.assigneeIds}
            label={uiCopy.board.cardAssigneesLabel}
            emptyLabel={uiCopy.board.cardAssigneesEmpty}
            disabled={!canEdit || updatingCard}
            testId="edit-card-assignees"
            onToggle={onToggleAssignee}
          />
          <CardLabelPicker
            labels={labels}
            selectedIds={editingCard.labelIds}
            label={uiCopy.board.cardLabelsLabel}
            emptyLabel={uiCopy.board.cardLabelsEmpty}
            disabled={!canEdit || updatingCard}
            testId="edit-card-labels"
            onToggle={onToggleLabel}
          />
          <AlertDialogFooter>
            <AlertDialogCancel type="button" size="sm">
              {uiCopy.common.cancel}
            </AlertDialogCancel>
            <Button type="submit" size="sm" disabled={!canEdit || updatingCard}>
              {updatingCard ? (
                <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
              ) : null}
              {updatingCard ? uiCopy.board.savingCard : uiCopy.board.saveCard}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
