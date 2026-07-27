import {
  createCard as createCardDocument,
  deleteCard as deleteCardDocument,
  updateCard as updateCardDocument,
  type CreateCardInput,
  type DeleteCardInput,
  type UpdateCardInput,
} from "@/features/cards/data/card-operations"
import { cardQueriesApi } from "@/features/cards/data/card-queries-api"
import {
  ensureCardId,
  ensureCardOrder,
} from "@/features/cards/model/card-normalizers"
import {
  optimisticCreateCard,
  optimisticDeleteCard,
  optimisticMoveCard,
  optimisticUpdateCardAssignees,
  optimisticUpdateCardLabels,
} from "@/features/cards/model/optimistic-helpers"
import { normalizeAssigneeIds } from "@/features/cards/model/card-assignees"
import { normalizeLabelIds } from "@/features/labels/model/label-normalizers"
import { getErrorMessage } from "@/lib/errors"
import type { RootState } from "@/lib/store"
import type { MutationResult } from "@/lib/store/firestore-api-types"
import type { Card } from "@/lib/types/boards"

const mutationOk: MutationResult = { ok: true }

// Read RTK Query cache to seed optimistic updates.
const getCachedColumns = (state: RootState, boardId: string) => {
  const result = cardsApi.endpoints.getColumns.select(boardId)(state)
  return result.data ?? []
}

const getCachedCards = (
  state: RootState,
  args: { boardId: string; columnId?: string | null }
) => {
  const result = cardsApi.endpoints.getCards.select(args)(state)
  return result.data ?? []
}

const hasCachedCards = (
  state: RootState,
  args: { boardId: string; columnId?: string | null }
) => cardsApi.endpoints.getCards.select(args)(state).status !== "uninitialized"

export const cardsApi = cardQueriesApi.injectEndpoints({
  endpoints: (builder) => ({
    createCard: builder.mutation<MutationResult, CreateCardInput>({
      async queryFn(args) {
        try {
          if (Array.isArray(args.assigneeIds)) {
            args.assigneeIds = normalizeAssigneeIds(args.assigneeIds)
          }
          if (Array.isArray(args.labelIds)) {
            args.labelIds = normalizeLabelIds(args.labelIds)
          }
          args.cardId = ensureCardId(args.boardId, args.cardId)
          args.order = ensureCardOrder(args.order)
          await createCardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Create card failed")),
          }
        }
      },
      async onQueryStarted(args, { dispatch, getState, queryFulfilled }) {
        const cardId = ensureCardId(args.boardId, args.cardId)
        const order = ensureCardOrder(args.order)
        const optimisticCard: Card = {
          id: cardId,
          boardId: args.boardId,
          columnId: args.columnId,
          title: args.title,
          order,
          createdById: args.createdById,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        if (typeof args.description === "string") {
          optimisticCard.description = args.description
        }
        if (Array.isArray(args.assigneeIds)) {
          optimisticCard.assigneeIds = normalizeAssigneeIds(args.assigneeIds)
        }
        if (Array.isArray(args.labelIds)) {
          optimisticCard.labelIds = normalizeLabelIds(args.labelIds)
        }
        if (args.dueAt instanceof Date) {
          optimisticCard.dueAt = args.dueAt.getTime()
        }
        if (typeof args.archived === "boolean") {
          optimisticCard.archived = args.archived
        }

        const patchResult = optimisticCreateCard({
          dispatch,
          boardId: args.boardId,
          card: optimisticCard,
          patchColumnCache: hasCachedCards(getState() as RootState, {
            boardId: args.boardId,
            columnId: args.columnId,
          }),
        })

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
    }),
    updateCard: builder.mutation<MutationResult, UpdateCardInput>({
      async queryFn(args) {
        try {
          if (Array.isArray(args.assigneeIds)) {
            args.assigneeIds = normalizeAssigneeIds(args.assigneeIds)
          }
          if (Array.isArray(args.labelIds)) {
            args.labelIds = normalizeLabelIds(args.labelIds)
          }
          await updateCardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Update card failed")),
          }
        }
      },
      async onQueryStarted(args, { dispatch, getState, queryFulfilled }) {
        const state = getState() as RootState
        const columns = getCachedColumns(state, args.boardId)
        const columnIds = columns
          .map((column) => column.id)
          .filter((columnId) =>
            hasCachedCards(state, { boardId: args.boardId, columnId })
          )
        const boardCards = getCachedCards(state, { boardId: args.boardId })
        let currentCard = boardCards.find((card) => card.id === args.cardId)

        if (!currentCard && columnIds.length) {
          for (const columnId of columnIds) {
            const columnCards = getCachedCards(state, {
              boardId: args.boardId,
              columnId,
            })
            const match = columnCards.find((card) => card.id === args.cardId)
            if (match) {
              currentCard = match
              break
            }
          }
        }

        const patches: Array<{ undo: () => void }> = []
        if (Array.isArray(args.assigneeIds)) {
          patches.push(
            optimisticUpdateCardAssignees({
              dispatch,
              boardId: args.boardId,
              cardId: args.cardId,
              assigneeIds: normalizeAssigneeIds(args.assigneeIds),
              columnIds,
            })
          )
        }
        if (Array.isArray(args.labelIds)) {
          patches.push(
            optimisticUpdateCardLabels({
              dispatch,
              boardId: args.boardId,
              cardId: args.cardId,
              labelIds: normalizeLabelIds(args.labelIds),
              columnIds,
            })
          )
        }

        const nextColumnId = args.columnId ?? currentCard?.columnId
        const nextOrder =
          typeof args.order === "number" ? args.order : currentCard?.order

        if (!nextColumnId || typeof nextOrder !== "number") {
          // Assignment patches can still apply without movement cache data.
        } else if (
          currentCard &&
          nextColumnId === currentCard.columnId &&
          nextOrder === currentCard.order
        ) {
          // No position patch is needed.
        } else {
          patches.push(
            optimisticMoveCard({
              dispatch,
              boardId: args.boardId,
              cardId: args.cardId,
              card: currentCard,
              fromColumnId: currentCard?.columnId,
              toColumnId: nextColumnId,
              order: nextOrder,
              columnIds,
            })
          )
        }

        try {
          await queryFulfilled
        } catch {
          patches.reverse().forEach((patch) => patch.undo())
        }
      },
    }),
    deleteCard: builder.mutation<MutationResult, DeleteCardInput>({
      async queryFn(args) {
        try {
          await deleteCardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Delete card failed")),
          }
        }
      },
      async onQueryStarted(args, { dispatch, getState, queryFulfilled }) {
        const state = getState() as RootState
        const columns = getCachedColumns(state, args.boardId)
        const columnIds = columns
          .map((column) => column.id)
          .filter((columnId) =>
            hasCachedCards(state, { boardId: args.boardId, columnId })
          )
        const boardCards = getCachedCards(state, { boardId: args.boardId })
        let currentCard = boardCards.find((card) => card.id === args.cardId)

        if (!currentCard && columnIds.length) {
          for (const columnId of columnIds) {
            const columnCards = getCachedCards(state, {
              boardId: args.boardId,
              columnId,
            })
            const match = columnCards.find((card) => card.id === args.cardId)
            if (match) {
              currentCard = match
              break
            }
          }
        }

        const patchResult = optimisticDeleteCard({
          dispatch,
          boardId: args.boardId,
          cardId: args.cardId,
          columnId: currentCard?.columnId,
          columnIds,
        })

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
    }),
  }),
})

export const {
  useCreateCardMutation,
  useDeleteCardMutation,
  useUpdateCardMutation,
} = cardsApi
