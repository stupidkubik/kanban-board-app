import type { Card } from "@/lib/types/boards"

export const isVisibleCard = (card: Card) => card.archived !== true

export type CardsProjection = {
  // Visible (non-archived) cards.
  cards: Card[]
  // Every loaded card document, archived included. The listener window is
  // `limit(500)` by order, so the card cap must count archived documents too:
  // otherwise a new card lands outside the window and vanishes.
  documentCount: number
  cardsByColumn: Map<string, Card[]>
  cardColumnById: Map<string, string>
}

const emptyCards: Card[] = []
const emptyProjection: CardsProjection = {
  cards: emptyCards,
  documentCount: 0,
  cardsByColumn: new Map(),
  cardColumnById: new Map(),
}
const projectionCache = new WeakMap<Card[], CardsProjection>()

export const projectCards = (cards: Card[] | undefined): CardsProjection => {
  if (!cards) {
    return emptyProjection
  }

  const cached = projectionCache.get(cards)
  if (cached) {
    return cached
  }

  const cardsList = cards.filter(isVisibleCard)
  const cardsByColumn = new Map<string, Card[]>()
  const cardColumnById = new Map<string, string>()

  cardsList.forEach((card) => {
    if (!card.columnId) {
      return
    }

    const columnCards = cardsByColumn.get(card.columnId)
    if (columnCards) {
      columnCards.push(card)
    } else {
      cardsByColumn.set(card.columnId, [card])
    }
    cardColumnById.set(card.id, card.columnId)
  })

  cardsByColumn.forEach((columnCards) => {
    columnCards.sort((left, right) => left.order - right.order)
  })

  const projection = {
    cards: cardsList,
    documentCount: cards.length,
    cardsByColumn,
    cardColumnById,
  }
  projectionCache.set(cards, projection)
  return projection
}
