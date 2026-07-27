import { getErrorMessage } from "@/lib/errors"
import { participantsApi } from "@/features/participants/data/participants-api"
import type { MutationResult } from "@/lib/store/firestore-api-types"
import {
  createCard as createCardDocument,
  deleteCard as deleteCardDocument,
  updateCard as updateCardDocument,
  type CreateCardInput,
  type DeleteCardInput,
  type UpdateCardInput,
} from "@/features/cards/data/card-operations"
import {
  optimisticCreateCard,
  optimisticDeleteCard,
  optimisticMoveCard,
} from "@/features/cards/model/optimistic-helpers"
import type { RootState } from "@/lib/store"
import type { Card } from "@/lib/types/boards"
import {
  ensureCardId,
  ensureCardOrder,
} from "@/features/cards/model/card-normalizers"
import {
  BOARD_CARD_LIMIT,
  BOARD_COLUMN_LIMIT,
  BOARD_MEMBER_LIMIT,
  subscribeToCards,
} from "@/lib/store/firestore-listeners"

export type { Invite } from "@/lib/store/firestore-normalizers"
export { BOARD_CARD_LIMIT, BOARD_COLUMN_LIMIT, BOARD_MEMBER_LIMIT }

const mutationOk: MutationResult = { ok: true }
// Read RTK Query cache to seed optimistic updates.
const getCachedColumns = (state: RootState, boardId: string) => {
  const result = firestoreApi.endpoints.getColumns.select(boardId)(state)
  return result.data ?? []
}

const getCachedCards = (
  state: RootState,
  args: { boardId: string; columnId?: string | null }
) => {
  const result = firestoreApi.endpoints.getCards.select(args)(state)
  return result.data ?? []
}

export const firestoreApi = participantsApi.injectEndpoints({
  endpoints: (builder) => ({
    getCards: builder.query<
      Card[],
      { boardId: string; columnId?: string | null } | null
    >({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
      providesTags: (result, _error, args) => {
        if (!args?.boardId) {
          return [{ type: "Card" as const, id: "LIST" }]
        }
        const suffix = args.columnId ? `-${args.columnId}` : ""
        const listId = `LIST-${args.boardId}${suffix}`
        return result
          ? [
              { type: "Card" as const, id: listId },
              ...result.map((card) => ({ type: "Card" as const, id: card.id })),
            ]
          : [{ type: "Card" as const, id: listId }]
      },
      async onCacheEntryAdded(
        args,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        if (!args?.boardId) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
        const unsubscribe = subscribeToCards(
          args,
          (nextCards) => {
            updateCachedData((draft) => {
              draft.length = 0
              draft.push(...nextCards)
            })
          },
          (error) => {
            console.error("Failed to load cards", error)
            updateCachedData((draft) => {
              draft.length = 0
            })
          }
        )

        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createCard: builder.mutation<MutationResult, CreateCardInput>({
      async queryFn(args) {
        try {
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
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
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
          optimisticCard.assigneeIds = args.assigneeIds
        }
        if (Array.isArray(args.labels)) {
          optimisticCard.labels = args.labels
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
        const columnIds = columns.map((column) => column.id)
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

        const nextColumnId = args.columnId ?? currentCard?.columnId
        const nextOrder =
          typeof args.order === "number" ? args.order : currentCard?.order

        if (!nextColumnId || typeof nextOrder !== "number") {
          try {
            await queryFulfilled
          } catch {
            // ignore optimistic updates if missing cache data
          }
          return
        }

        if (
          currentCard &&
          nextColumnId === currentCard.columnId &&
          nextOrder === currentCard.order
        ) {
          try {
            await queryFulfilled
          } catch {
            // ignore optimistic updates if no change
          }
          return
        }

        const patchResult = optimisticMoveCard({
          dispatch,
          boardId: args.boardId,
          cardId: args.cardId,
          card: currentCard,
          fromColumnId: currentCard?.columnId,
          toColumnId: nextColumnId,
          order: nextOrder,
          columnIds,
        })

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
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
        const columnIds = columns.map((column) => column.id)
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
  useCreateBoardMutation,
  useCreateCardMutation,
  useCreateColumnMutation,
  useDeleteCardMutation,
  useDeleteBoardMutation,
  useDeleteColumnMutation,
  useGetBoardMembersQuery,
  useGetBoardQuery,
  useGetBoardsQuery,
  useGetCardsQuery,
  useGetColumnsQuery,
  useGetInvitesQuery,
  useUpdateCardMutation,
  useUpdateBoardTitleMutation,
  useUpdateColumnMutation,
  useUpdateBoardLanguageMutation,
} = firestoreApi
