"use client"

import * as React from "react"

import { type BoardCopy, type EditingCardDraft } from "@/lib/types/board-ui"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      <DialogContent size="lg" className={styles.cardDialog}>
        <DialogHeader>
          <DialogTitle>{uiCopy.board.editCardTitle}</DialogTitle>
          <DialogDescription>
            {uiCopy.board.editCardDescription}
          </DialogDescription>
        </DialogHeader>
        <form className={styles.cardDialogForm} onSubmit={onSubmit}>
        <DialogBody>
        <div className={styles.cardForm}>
          <Field>
            <FieldLabel htmlFor="edit-card-title">
              {uiCopy.board.cardTitlePlaceholder}
            </FieldLabel>
            <FieldContent>
              <Input
                id="edit-card-title"
                className={styles.cardFormInput}
                value={editingCard.title}
                onChange={(event) => onFieldChange("title", event.target.value)}
                placeholder={uiCopy.board.cardTitlePlaceholder}
                disabled={!canEdit || updatingCard}
                autoFocus
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-card-description">
              {uiCopy.board.cardDescriptionPlaceholder}
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="edit-card-description"
                className={styles.cardFormTextarea}
                value={editingCard.description}
                onChange={(event) => onFieldChange("description", event.target.value)}
                placeholder={uiCopy.board.cardDescriptionPlaceholder}
                rows={4}
                disabled={!canEdit || updatingCard}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-card-due">
              {uiCopy.board.cardDueDateLabel}
            </FieldLabel>
            <FieldContent>
            <Input
              id="edit-card-due"
              className={`${styles.cardDateInput} ${styles.cardFormInput}`}
              value={editingCard.due}
              onChange={(event) => onFieldChange("due", event.target.value)}
              type="date"
              disabled={!canEdit || updatingCard}
            />
            </FieldContent>
          </Field>
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
        </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" disabled={updatingCard}>
              {uiCopy.common.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" size="sm" disabled={!canEdit || updatingCard}>
            {updatingCard ? <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" /> : null}
            {updatingCard ? uiCopy.board.savingCard : uiCopy.board.saveCard}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
