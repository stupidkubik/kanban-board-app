import { firestoreApi } from "@/lib/store/firestore-api"
import type { AppDispatch } from "@/lib/store"
import type { Card } from "@/lib/types/boards"

type PatchResult = { undo: () => void }

type CreateCardOptimisticArgs = {
  dispatch: AppDispatch
  boardId: string
  card: Card
}

type MoveCardOptimisticArgs = {
  dispatch: AppDispatch
  boardId: string
  cardId: string
  card?: Card
  fromColumnId?: string | null
  toColumnId: string
  order: number
  columnIds?: string[]
}

type DeleteCardOptimisticArgs = {
  dispatch: AppDispatch
  boardId: string
  cardId: string
  columnId?: string | null
  columnIds?: string[]
}

const buildCardSorter = () => (first: Card, second: Card) => {
  return first.order - second.order
}

const updateCardOrder = (draft: Card[], cardId: string, toColumnId: string, order: number) => {
  const card = draft.find((item) => item.id === cardId)
  if (!card) {
    return
  }
  card.columnId = toColumnId
  card.order = order
}

const removeCardFromList = (draft: Card[], cardId: string) => {
  const index = draft.findIndex((item) => item.id === cardId)
  if (index >= 0) {
    draft.splice(index, 1)
  }
}

const addCardToList = (
  draft: Card[],
  cardId: string,
  toColumnId: string,
  order: number,
  card: Card,
  shouldSort: boolean
) => {
  const existing = draft.find((item) => item.id === cardId)
  if (existing) {
    existing.columnId = toColumnId
    existing.order = order
  } else {
    draft.push({
      ...card,
      columnId: toColumnId,
      order,
    })
  }
  if (shouldSort) {
    draft.sort(buildCardSorter())
  }
}

const combinePatches = (patches: PatchResult[]): PatchResult => {
  return {
    undo: () => {
      patches.forEach((patch) => patch.undo())
    },
  }
}

export const optimisticMoveCard = ({
  dispatch,
  boardId,
  cardId,
  card,
  fromColumnId,
  toColumnId,
  order,
  columnIds,
}: MoveCardOptimisticArgs): PatchResult => {
  const patches: PatchResult[] = []

  patches.push(
    dispatch(
      firestoreApi.util.updateQueryData("getCards", { boardId }, (draft) => {
        const existing = draft.find((item) => item.id === cardId)
        if (existing) {
          updateCardOrder(draft, cardId, toColumnId, order)
        } else if (card) {
          draft.push({
            ...card,
            columnId: toColumnId,
            order,
          })
        }
      })
    )
  )

  const candidateColumnIds = new Set(columnIds ?? [])
  if (fromColumnId) {
    candidateColumnIds.add(fromColumnId)
  }
  candidateColumnIds.add(toColumnId)

  candidateColumnIds.forEach((columnId) => {
    patches.push(
      dispatch(
        firestoreApi.util.updateQueryData(
          "getCards",
          { boardId, columnId },
          (draft) => {
            const existing = draft.find((item) => item.id === cardId)
            if (columnId === toColumnId) {
              if (existing) {
                updateCardOrder(draft, cardId, toColumnId, order)
              } else if (card) {
                addCardToList(draft, cardId, toColumnId, order, card, true)
                return
              }
              draft.sort(buildCardSorter())
            } else if (existing) {
              removeCardFromList(draft, cardId)
            }
          }
        )
      )
    )
  })

  return combinePatches(patches)
}

export const optimisticCreateCard = ({
  dispatch,
  boardId,
  card,
}: CreateCardOptimisticArgs): PatchResult => {
  const patches: PatchResult[] = []

  patches.push(
    dispatch(
      firestoreApi.util.updateQueryData("getCards", { boardId }, (draft) => {
        const existing = draft.find((item) => item.id === card.id)
        if (existing) {
          existing.columnId = card.columnId
          existing.order = card.order
        } else {
          draft.push(card)
        }
      })
    )
  )

  patches.push(
    dispatch(
      firestoreApi.util.updateQueryData(
        "getCards",
        { boardId, columnId: card.columnId },
        (draft) => {
          addCardToList(draft, card.id, card.columnId, card.order, card, true)
        }
      )
    )
  )

  return combinePatches(patches)
}

export const optimisticDeleteCard = ({
  dispatch,
  boardId,
  cardId,
  columnId,
  columnIds,
}: DeleteCardOptimisticArgs): PatchResult => {
  const patches: PatchResult[] = []

  patches.push(
    dispatch(
      firestoreApi.util.updateQueryData("getCards", { boardId }, (draft) => {
        removeCardFromList(draft, cardId)
      })
    )
  )

  const candidateColumnIds = new Set(columnIds ?? [])
  if (columnId) {
    candidateColumnIds.add(columnId)
  }

  candidateColumnIds.forEach((candidateId) => {
    patches.push(
      dispatch(
        firestoreApi.util.updateQueryData(
          "getCards",
          { boardId, columnId: candidateId },
          (draft) => {
            removeCardFromList(draft, cardId)
          }
        )
      )
    )
  })

  return combinePatches(patches)
}
