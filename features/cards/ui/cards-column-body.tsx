"use client"

import * as React from "react"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus } from "@phosphor-icons/react"
import { CSS } from "@dnd-kit/utilities"

import type { Card as BoardCard } from "@/lib/types/boards"
import type { getCopy } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import styles from "@/features/cards/ui/cards.module.css"
import type { CardAssignee } from "@/lib/types/board-ui"
import { CardAssigneePicker } from "@/features/cards/ui/card-assignee-picker"
import { CardAssigneeList } from "@/features/cards/ui/card-assignee-list"
import { CardLabelPicker } from "@/features/labels/ui/card-label-picker"
import { CardLabelList } from "@/features/labels/ui/card-label-list"
import type { BoardLabel } from "@/lib/types/boards"
import { selectBoardUi } from "@/lib/store/board-ui-slice"
import { useAppSelector } from "@/lib/store/hooks"

type DragCardData = { columnId?: string }

const isOverdueDate = (value?: number) => {
  if (!value) {
    return false
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return value < today.getTime()
}

type SortableCardItemProps = {
  card: BoardCard
  canEdit: boolean
  canDelete: boolean
  onEdit: (card: BoardCard) => void
  onDelete: (card: BoardCard) => void
  deleteLabel: string
  dueLabel: string
  overdueLabel: string
  formatDueDate: (value?: number) => string | null
  assigneesById: Map<string, CardAssignee>
  assigneesLabel: string
  labelsById: Map<string, BoardLabel>
  labelsLabel: string
}

const SortableCardItem = React.memo(function SortableCardItem({
  card,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  deleteLabel,
  dueLabel,
  overdueLabel,
  formatDueDate,
  assigneesById,
  assigneesLabel,
  labelsById,
  labelsLabel,
}: SortableCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { columnId: card.columnId } satisfies DragCardData,
      disabled: !canEdit,
    })
  const hasTransform =
    !!transform &&
    (transform.x !== 0 ||
      transform.y !== 0 ||
      transform.scaleX !== 1 ||
      transform.scaleY !== 1)
  const style: React.CSSProperties = {
    transform: isDragging || !hasTransform ? undefined : CSS.Transform.toString(transform),
    transition: isDragging || !hasTransform ? undefined : transition,
    cursor: canEdit ? "grab" : "default",
  }
  const isOverdue = isOverdueDate(card.dueAt)
  const cardAssignees = (card.assigneeIds ?? [])
    .map((id) => assigneesById.get(id))
    .filter((assignee): assignee is CardAssignee => Boolean(assignee))
  const cardLabels = (card.labelIds ?? [])
    .map((id) => labelsById.get(id))
    .filter((label): label is BoardLabel => Boolean(label))
  const className = [
    styles.cardItem,
    isDragging ? styles.cardDragging : "",
    isOverdue ? styles.cardItemOverdue : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={className}
      data-testid={`card-${card.id}`}
      data-card-title={card.title}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (canEdit && !isDragging) {
          onEdit(card)
        }
      }}
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : -1}
      onKeyDown={(event) => {
        if (canEdit && !isDragging && event.key === "Enter") {
          event.preventDefault()
          onEdit(card)
          return
        }
        listeners?.onKeyDown?.(event)
      }}
    >
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardTitle} data-testid="card-title">
          {card.title}
        </div>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={styles.cardActionButton}
            aria-label={deleteLabel}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(card)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6a1 1 0 0 1 .993.883L16 4v1h4a1 1 0 0 1 .117 1.993L20 7h-1.07l-.76 11.403A2 2 0 0 1 16.175 20H7.825a2 2 0 0 1-1.995-1.597L5.07 7H4a1 1 0 0 1-.117-1.993L4 5h4V4a1 1 0 0 1 1-1Zm6 2H9v1h6V5Zm-2 4a1 1 0 0 1 .993.883L14 10v6a1 1 0 0 1-1.993.117L12 16v-6a1 1 0 0 1 1-1Zm-4 0a1 1 0 0 1 .993.883L10 10v6a1 1 0 0 1-1.993.117L8 16v-6a1 1 0 0 1 1-1Z" />
            </svg>
          </Button>
        ) : null}
      </div>
      {card.description ? (
        <div className={styles.cardDescription} data-testid="card-description">
          {card.description}
        </div>
      ) : null}
      {card.dueAt ? (
        <div className={styles.cardMeta} data-overdue={isOverdue ? "true" : undefined}>
          {isOverdue ? <span className={styles.overdueLabel}>{overdueLabel}</span> : null}
          {dueLabel}: {formatDueDate(card.dueAt)}
        </div>
      ) : null}
      <CardAssigneeList assignees={cardAssignees} label={assigneesLabel} />
      <CardLabelList labels={cardLabels} ariaLabel={labelsLabel} />
    </li>
  )
})

type CardsColumnBodyProps = {
  boardId: string | null
  columnId: string
  cards: BoardCard[]
  canEdit: boolean
  canDelete: boolean
  uiCopy: ReturnType<typeof getCopy>
  isLoading: boolean
  activeCardId: string | null
  activeCardColumnId: string | null
  hoveredColumnId: string | null
  overCardId: string | null
  creatingCard: boolean
  assignees: CardAssignee[]
  assigneesById: Map<string, CardAssignee>
  labels: BoardLabel[]
  labelsById: Map<string, BoardLabel>
  onChangeCardTitle: (columnId: string, value: string) => void
  onChangeCardDescription: (columnId: string, value: string) => void
  onChangeCardDue: (columnId: string, value: string) => void
  onToggleCardAssignee: (columnId: string, assigneeId: string) => void
  onToggleCardLabel: (columnId: string, labelId: string) => void
  onCreateCard: (
    event: React.FormEvent<HTMLFormElement>,
    columnId: string
  ) => void
  onCancelCreateCard: (columnId: string) => void
  onToggleAddCard: (columnId: string, open: boolean) => void
  onStartEditingCard: (card: BoardCard) => void
  onStartDeletingCard: (card: BoardCard) => void
  formatDueDate: (value?: number) => string | null
}

export const CardsColumnBody = React.memo(function CardsColumnBody({
  boardId,
  columnId,
  cards,
  canEdit,
  canDelete,
  uiCopy,
  isLoading,
  activeCardId,
  activeCardColumnId,
  hoveredColumnId,
  overCardId,
  creatingCard,
  assignees,
  assigneesById,
  labels,
  labelsById,
  onChangeCardTitle,
  onChangeCardDescription,
  onChangeCardDue,
  onToggleCardAssignee,
  onToggleCardLabel,
  onCreateCard,
  onCancelCreateCard,
  onToggleAddCard,
  onStartEditingCard,
  onStartDeletingCard,
  formatDueDate,
}: CardsColumnBodyProps) {
  const draft = useAppSelector(
    (state) => selectBoardUi(state, boardId).addCardByColumn[columnId]
  )
  const showAddCard = canEdit && Boolean(draft?.open)
  const newCardTitle = draft?.title ?? ""
  const newCardDescription = draft?.description ?? ""
  const newCardDue = draft?.due ?? ""
  const newCardAssigneeIds = draft?.assigneeIds ?? []
  const newCardLabelIds = draft?.labelIds ?? []
  const dueLabel = uiCopy.board.cardDueDateLabel
  const isDropTarget = hoveredColumnId === columnId
  const showPlaceholder = !!activeCardId && !!activeCardColumnId && isDropTarget
  const placeholderIndex = (() => {
    if (!showPlaceholder) {
      return -1
    }
    if (!overCardId) {
      return cards.length
    }
    const index = cards.findIndex((card) => card.id === overCardId)
    return index >= 0 ? index : cards.length
  })()

  const showCardsSkeleton = isLoading && cards.length === 0

  return (
    <>
      {showCardsSkeleton ? (
        <ul className={styles.cardList} aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={`card-skeleton-${columnId}-${index}`} className={styles.cardItem}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonLine}`} />
              <div
                className={`${styles.skeletonBlock} ${styles.skeletonLine} ${styles.skeletonLineShort}`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.cardList}>
            {cards.map((card, index) => (
              <React.Fragment key={card.id}>
                {showPlaceholder && placeholderIndex === index ? (
                  <li
                    className={styles.cardPlaceholder}
                    aria-hidden
                  />
                ) : null}
                <SortableCardItem
                  card={card}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onStartEditingCard}
                  onDelete={onStartDeletingCard}
                  deleteLabel={uiCopy.board.deleteCard}
                  dueLabel={dueLabel}
                  overdueLabel={uiCopy.board.cardOverdue}
                  formatDueDate={formatDueDate}
                  assigneesById={assigneesById}
                  assigneesLabel={uiCopy.board.cardAssigneesLabel}
                  labelsById={labelsById}
                  labelsLabel={uiCopy.board.cardLabelsLabel}
                />
              </React.Fragment>
            ))}
            {showPlaceholder &&
            placeholderIndex >= cards.length ? (
              <li className={styles.cardPlaceholder} aria-hidden />
            ) : null}
          </ul>
        </SortableContext>
      )}
      {!cards.length && !showCardsSkeleton ? (
        <p className={styles.cardsEmpty}>{uiCopy.board.noCards}</p>
      ) : null}
      {canEdit ? (
        <Dialog
          open={showAddCard}
          onOpenChange={(open) => onToggleAddCard(columnId, open)}
        >
          <DialogContent size="lg" className={styles.cardDialog}>
            <DialogHeader>
              <DialogTitle>{uiCopy.board.createCard}</DialogTitle>
              <DialogDescription>{uiCopy.board.cardTitlePlaceholder}</DialogDescription>
            </DialogHeader>
            <form className={styles.cardDialogForm} onSubmit={(event) => onCreateCard(event, columnId)}>
              <DialogBody>
              <div className={styles.cardForm}>
                <Field>
                  <FieldLabel htmlFor={`new-card-title-${columnId}`}>
                    {uiCopy.board.cardTitlePlaceholder}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={`new-card-title-${columnId}`}
                      className={styles.cardFormInput}
                      value={newCardTitle}
                      onChange={(event) =>
                        onChangeCardTitle(columnId, event.target.value)
                      }
                      placeholder={uiCopy.board.cardTitlePlaceholder}
                      disabled={creatingCard}
                      data-testid={`new-card-title-${columnId}`}
                      autoFocus
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`new-card-description-${columnId}`}>
                    {uiCopy.board.cardDescriptionPlaceholder}
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      id={`new-card-description-${columnId}`}
                      className={styles.cardFormTextarea}
                      value={newCardDescription}
                      onChange={(event) =>
                        onChangeCardDescription(columnId, event.target.value)
                      }
                      placeholder={uiCopy.board.cardDescriptionPlaceholder}
                      rows={4}
                      disabled={creatingCard}
                      data-testid={`new-card-description-${columnId}`}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`new-card-due-${columnId}`}>
                    {uiCopy.board.cardDueDateLabel}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={`new-card-due-${columnId}`}
                      className={`${styles.cardDateInput} ${styles.cardFormInput}`}
                      value={newCardDue}
                      onChange={(event) => onChangeCardDue(columnId, event.target.value)}
                      type="date"
                      disabled={creatingCard}
                      data-testid={`new-card-due-${columnId}`}
                    />
                  </FieldContent>
                </Field>
                <CardAssigneePicker
                  assignees={assignees}
                  selectedIds={newCardAssigneeIds}
                  label={uiCopy.board.cardAssigneesLabel}
                  emptyLabel={uiCopy.board.cardAssigneesEmpty}
                  disabled={creatingCard}
                  testId={`new-card-assignees-${columnId}`}
                  onToggle={(assigneeId) => onToggleCardAssignee(columnId, assigneeId)}
                />
                <CardLabelPicker
                  labels={labels}
                  selectedIds={newCardLabelIds}
                  label={uiCopy.board.cardLabelsLabel}
                  emptyLabel={uiCopy.board.cardLabelsEmpty}
                  disabled={creatingCard}
                  testId={`new-card-labels-${columnId}`}
                  onToggle={(labelId) => onToggleCardLabel(columnId, labelId)}
                />
              </div>
              </DialogBody>
              <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCancelCreateCard(columnId)}
                disabled={creatingCard}
                data-testid={`cancel-card-${columnId}`}
              >
                {uiCopy.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingCard}
                data-testid={`create-card-${columnId}`}
              >
                {creatingCard ? <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" /> : null}
                {creatingCard ? uiCopy.board.creatingCard : uiCopy.board.createCard}
              </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          variant="ghost"
          className={styles.addCardButton}
          onClick={() => onToggleAddCard(columnId, true)}
          data-testid={`add-card-${columnId}`}
        >
          <Plus weight="bold" />
          {uiCopy.board.addCard}
        </Button>
      ) : null}
    </>
  )
})
