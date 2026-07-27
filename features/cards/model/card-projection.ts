import type { Card } from "@/lib/types/boards"

export type CardsProjection = {
  cards: Card[]
  cardsByColumn: Map<string, Card[]>
  cardColumnById: Map<string, string>
}

const emptyCards: Card[] = []
const emptyProjection: CardsProjection = {
  cards: emptyCards,
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

  const cardsList = cards
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
    cardsByColumn,
    cardColumnById,
  }
  projectionCache.set(cards, projection)
  return projection
}
