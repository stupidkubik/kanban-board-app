"use client"

import * as React from "react"

import { type BoardCopy } from "@/lib/types/board-ui"
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

type CardDeleteDialogProps = {
  open: boolean
  deleteCardTitle: string
  isOwner: boolean
  deletingCard: boolean
  uiCopy: BoardCopy
  onConfirm: () => void
  onClose: () => void
}

export function CardDeleteDialog({
  open,
  deleteCardTitle,
  isOwner,
  deletingCard,
  uiCopy,
  onConfirm,
  onClose,
}: CardDeleteDialogProps) {
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
          <AlertDialogTitle>{uiCopy.board.deleteCardTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {uiCopy.board.deleteCardDescription}
            {deleteCardTitle ? ` "${deleteCardTitle}"` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">
            {uiCopy.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={!isOwner || deletingCard}
          >
            {uiCopy.board.deleteCard}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
