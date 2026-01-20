"use client"

import * as React from "react"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { Card as BoardCard } from "@/lib/types/boards"
import type { getCopy } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import styles from "@/features/board/ui/board-page.module.css"

type DragCardData = { columnId?: string }

type SortableCardItemProps = {
  card: BoardCard
  canEdit: boolean
  canDelete: boolean
  onEdit: (card: BoardCard) => void
  onDelete: (card: BoardCard) => void
  deleteLabel: string
  dueLabel: string
  formatDueDate: (value?: number) => string | null
}

const SortableCardItem = ({
  card,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  deleteLabel,
  dueLabel,
  formatDueDate,
}: SortableCardItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { columnId: card.columnId } satisfies DragCardData,
      disabled: !canEdit,
    })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: canEdit ? "grab" : "default",
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        isDragging ? `${styles.cardItem} ${styles.cardDragging}` : styles.cardItem
      }
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
        if (!canEdit || isDragging) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onEdit(card)
        }
      }}
    >
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardTitle}>{card.title}</div>
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
        <div className={styles.cardDescription}>{card.description}</div>
      ) : null}
      {card.dueAt ? (
        <div className={styles.cardMeta}>
          {dueLabel}: {formatDueDate(card.dueAt)}
        </div>
      ) : null}
    </li>
  )
}

type CardsColumnBodyProps = {
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
  showAddCard: boolean
  creatingCard: boolean
  newCardTitle: string
  newCardDescription: string
  newCardDue: string
  onChangeCardTitle: (value: string) => void
  onChangeCardDescription: (value: string) => void
  onChangeCardDue: (value: string) => void
  onCreateCard: (event: React.FormEvent<HTMLFormElement>) => void
  onCancelCreateCard: () => void
  onToggleAddCard: (open: boolean) => void
  onStartEditingCard: (card: BoardCard) => void
  onStartDeletingCard: (card: BoardCard) => void
  formatDueDate: (value?: number) => string | null
}

export const CardsColumnBody = React.memo(function CardsColumnBody({
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
  showAddCard,
  creatingCard,
  newCardTitle,
  newCardDescription,
  newCardDue,
  onChangeCardTitle,
  onChangeCardDescription,
  onChangeCardDue,
  onCreateCard,
  onCancelCreateCard,
  onToggleAddCard,
  onStartEditingCard,
  onStartDeletingCard,
  formatDueDate,
}: CardsColumnBodyProps) {
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
                  formatDueDate={formatDueDate}
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
      {showAddCard ? (
        <form className={styles.cardForm} onSubmit={onCreateCard}>
          <Input
            value={newCardTitle}
            onChange={(event) => onChangeCardTitle(event.target.value)}
            placeholder={uiCopy.board.cardTitlePlaceholder}
            aria-label={uiCopy.board.cardTitlePlaceholder}
            disabled={!canEdit || creatingCard}
            data-testid={`new-card-title-${columnId}`}
          />
          <Textarea
            value={newCardDescription}
            onChange={(event) => onChangeCardDescription(event.target.value)}
            placeholder={uiCopy.board.cardDescriptionPlaceholder}
            aria-label={uiCopy.board.cardDescriptionPlaceholder}
            rows={3}
            disabled={!canEdit || creatingCard}
            data-testid={`new-card-description-${columnId}`}
          />
          <div className={styles.cardFormRow}>
            <Input
              className={styles.cardDateInput}
              value={newCardDue}
              onChange={(event) => onChangeCardDue(event.target.value)}
              type="date"
              aria-label={uiCopy.board.cardDueDateLabel}
              disabled={!canEdit || creatingCard}
              data-testid={`new-card-due-${columnId}`}
            />
            <Button
              type="submit"
              disabled={!canEdit || creatingCard}
              data-testid={`create-card-${columnId}`}
            >
              {creatingCard ? (
                <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
              ) : null}
              {creatingCard
                ? uiCopy.board.creatingCard
                : uiCopy.board.createCard}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancelCreateCard}
              data-testid={`cancel-card-${columnId}`}
            >
              {uiCopy.common.cancel}
            </Button>
          </div>
        </form>
      ) : canEdit ? (
        <Button
          type="button"
          variant="ghost"
          className={styles.addCardButton}
          onClick={() => onToggleAddCard(true)}
          data-testid={`add-card-${columnId}`}
        >
          {uiCopy.board.addCard}
        </Button>
      ) : null}
    </>
  )
})
