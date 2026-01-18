"use client"

import * as React from "react"

import { type BoardCopy } from "@/lib/types/board-ui"
import { type EditingCardDraft } from "@/lib/store/board-ui-slice"
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
import styles from "@/components/board-page.module.css"

type CardEditDialogProps = {
  open: boolean
  canEdit: boolean
  updatingCard: boolean
  uiCopy: BoardCopy
  editingCard: EditingCardDraft
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: "title" | "description" | "due", value: string) => void
  onClose: () => void
}

export function CardEditDialog({
  open,
  canEdit,
  updatingCard,
  uiCopy,
  editingCard,
  onSubmit,
  onFieldChange,
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
          <Input
            value={editingCard.title}
            onChange={(event) => onFieldChange("title", event.target.value)}
            placeholder={uiCopy.board.cardTitlePlaceholder}
            aria-label={uiCopy.board.cardTitlePlaceholder}
            disabled={!canEdit || updatingCard}
            autoFocus
          />
          <Textarea
            value={editingCard.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            placeholder={uiCopy.board.cardDescriptionPlaceholder}
            aria-label={uiCopy.board.cardDescriptionPlaceholder}
            rows={4}
            disabled={!canEdit || updatingCard}
          />
          <div className={styles.cardFormRow}>
            <Input
              className={styles.cardDateInput}
              value={editingCard.due}
              onChange={(event) => onFieldChange("due", event.target.value)}
              type="date"
              aria-label={uiCopy.board.cardDueDateLabel}
              disabled={!canEdit || updatingCard}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {uiCopy.common.cancel}
            </AlertDialogCancel>
            <Button type="submit" disabled={!canEdit || updatingCard}>
              {updatingCard ? uiCopy.board.savingCard : uiCopy.board.saveCard}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
