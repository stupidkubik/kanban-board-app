import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react"

import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import {
  createBoard as createBoardDocument,
  createColumn as createColumnDocument,
  deleteBoard as deleteBoardDocument,
  deleteColumn as deleteColumnDocument,
  updateBoardLanguage as updateBoardLanguageDocument,
  updateBoardTitle as updateBoardTitleDocument,
  updateColumn as updateColumnDocument,
  type CreateBoardInput,
  type CreateColumnInput,
  type DeleteBoardInput,
  type DeleteColumnInput,
  type UpdateBoardLanguageInput,
  type UpdateBoardTitleInput,
  type UpdateColumnInput,
} from "@/lib/store/firestore-operations"
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
import type { Board, BoardMemberProfile, Card, Column } from "@/lib/types/boards"
import {
  type Invite,
} from "@/lib/store/firestore-normalizers"
import {
  ensureCardId,
  ensureCardOrder,
} from "@/features/cards/model/card-normalizers"
import {
  BOARD_CARD_LIMIT,
  BOARD_COLUMN_LIMIT,
  BOARD_MEMBER_LIMIT,
  subscribeToBoard,
  subscribeToBoardMembers,
  subscribeToBoards,
  subscribeToCards,
  subscribeToColumns,
  subscribeToInvites,
} from "@/lib/store/firestore-listeners"

export type { Invite } from "@/lib/store/firestore-normalizers"
export { BOARD_CARD_LIMIT, BOARD_COLUMN_LIMIT, BOARD_MEMBER_LIMIT }

type MutationResult = { ok: true }
type CreateBoardResult = MutationResult & { boardId: string }
type BoardQueryState = {
  status: "loading" | "ready" | "not-found" | "forbidden" | "error"
  board: Board | null
}
type BoardQueryInput = { boardId: string | null; subscriptionKey: number }

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

export const firestoreApi = createApi({
  reducerPath: "firestoreApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Board", "Invite", "Column", "Member", "Card"],
  endpoints: (builder) => ({
    // Firestore listeners drive the cache; queryFn is a stub and onCacheEntryAdded updates it.
    getBoards: builder.query<Board[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 60,
      providesTags: (result) =>
        result
          ? [
              { type: "Board" as const, id: "LIST" },
              ...result.map((board) => ({ type: "Board" as const, id: board.id })),
            ]
          : [{ type: "Board" as const, id: "LIST" }],
      async onCacheEntryAdded(
        uid,
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!uid) {
          await cacheEntryRemoved
          return
        }

        const unsubscribe = subscribeToBoards(
          uid,
          (nextBoards) => {
            updateCachedData((draft) => {
              draft.length = 0
              draft.push(...nextBoards)
            })
          },
          (error) => {
            console.error("Failed to load boards", error)
            updateCachedData((draft) => {
              draft.length = 0
            })
          }
        )

        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getBoard: builder.query<BoardQueryState, BoardQueryInput>({
      queryFn: async () => ({ data: { status: "loading", board: null } }),
      keepUnusedDataFor: 60,
      providesTags: (_result, _error, args) =>
        args.boardId
          ? [{ type: "Board" as const, id: args.boardId }]
          : [{ type: "Board" as const, id: "DETAIL" }],
      async onCacheEntryAdded(
        args,
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!args.boardId) {
          await cacheEntryRemoved
          return
        }

        const boardId = args.boardId
        const unsubscribe = subscribeToBoard(
          boardId,
          (board) => {
            updateCachedData(() => {
              if (!board) {
                return { status: "not-found", board: null }
              }
              return { status: "ready", board }
            })
          },
          async () => {
            let status: BoardQueryState["status"] = "error"
            try {
              const response = await fetchWithAppCheck(
                `/api/boards/${encodeURIComponent(boardId)}`,
                { credentials: "same-origin" }
              )
              if (response.status === 404) {
                status = "not-found"
              } else if (response.status === 401 || response.status === 403) {
                status = "forbidden"
              }
            } catch {
              status = "error"
            }
            updateCachedData(() => ({ status, board: null }))
          }
        )

        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getInvites: builder.query<Invite[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
      providesTags: (result) =>
        result
          ? [
              { type: "Invite" as const, id: "LIST" },
              ...result.map((invite) => ({ type: "Invite" as const, id: invite.id })),
            ]
          : [{ type: "Invite" as const, id: "LIST" }],
      async onCacheEntryAdded(
        email,
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!email) {
          await cacheEntryRemoved
          return
        }

        const unsubscribe = subscribeToInvites(
          email,
          (nextInvites) => {
            updateCachedData((draft) => {
              draft.length = 0
              draft.push(...nextInvites)
            })
          },
          () => {
            updateCachedData((draft) => {
              draft.length = 0
            })
          }
        )

        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createBoard: builder.mutation<CreateBoardResult, CreateBoardInput>({
      async queryFn(args) {
        try {
          const boardId = await createBoardDocument(args)
          return { data: { ...mutationOk, boardId } }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Create board failed"),
          }
        }
      },
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const createdAt = Date.now()
          dispatch(
            firestoreApi.util.updateQueryData(
              "getBoards",
              args.ownerId,
              (draft) => {
                if (draft.some((board) => board.id === data.boardId)) {
                  return
                }
                draft.push({
                  id: data.boardId,
                  title: args.title,
                  ownerId: args.ownerId,
                  members: { [args.ownerId]: true },
                  roles: { [args.ownerId]: "owner" },
                  language: args.language,
                  createdAt,
                  updatedAt: createdAt,
                })
              }
            )
          )
        } catch {
          // ignore cache update if mutation fails
        }
      },
    }),
    updateBoardLanguage: builder.mutation<MutationResult, UpdateBoardLanguageInput>({
      async queryFn(args) {
        try {
          await updateBoardLanguageDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error:
              error instanceof Error ? error : new Error("Update board language failed"),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Board", id: arg.boardId },
      ],
    }),
    updateBoardTitle: builder.mutation<MutationResult, UpdateBoardTitleInput>({
      async queryFn(args) {
        try {
          await updateBoardTitleDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error:
              error instanceof Error ? error : new Error("Update board title failed"),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Board", id: arg.boardId },
      ],
    }),
    deleteBoard: builder.mutation<MutationResult, DeleteBoardInput>({
      async queryFn(args) {
        try {
          await deleteBoardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Delete board failed"),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Board", id: arg.boardId },
        { type: "Board", id: "LIST" },
      ],
    }),
    getColumns: builder.query<Column[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
      providesTags: (result, _error, boardId) => {
        if (!boardId) {
          return [{ type: "Column" as const, id: "LIST" }]
        }
        const listId = `LIST-${boardId}`
        return result
          ? [
              { type: "Column" as const, id: listId },
              ...result.map((column) => ({ type: "Column" as const, id: column.id })),
            ]
          : [{ type: "Column" as const, id: listId }]
      },
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!boardId) {
          await cacheEntryRemoved
          return
        }

        const unsubscribe = subscribeToColumns(
          boardId,
          (nextColumns) => {
            updateCachedData((draft) => {
              draft.length = 0
              draft.push(...nextColumns)
            })
          },
          (error) => {
            console.error("Failed to load columns", error)
            updateCachedData((draft) => {
              draft.length = 0
            })
          }
        )

        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getBoardMembers: builder.query<BoardMemberProfile[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
      providesTags: (result, _error, boardId) => {
        if (!boardId) {
          return [{ type: "Member" as const, id: "LIST" }]
        }
        const listId = `LIST-${boardId}`
        return result
          ? [
              { type: "Member" as const, id: listId },
              ...result.map((member) => ({ type: "Member" as const, id: member.id })),
            ]
          : [{ type: "Member" as const, id: listId }]
      },
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!boardId) {
          await cacheEntryRemoved
          return
        }

        const unsubscribe = subscribeToBoardMembers(
          boardId,
          (nextMembers) => {
            updateCachedData((draft) => {
              draft.length = 0
              draft.push(...nextMembers)
            })
          },
          (error) => {
            console.error("Failed to load board members", error)
            updateCachedData((draft) => {
              draft.length = 0
            })
          }
        )

        await cacheEntryRemoved
        unsubscribe()
      },
    }),
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
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!args?.boardId) {
          await cacheEntryRemoved
          return
        }

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
    createColumn: builder.mutation<MutationResult, CreateColumnInput>({
      async queryFn(args) {
        try {
          await createColumnDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Create column failed"),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Column", id: `LIST-${arg.boardId}` },
      ],
    }),
    updateColumn: builder.mutation<MutationResult, UpdateColumnInput>({
      async queryFn(args) {
        try {
          await updateColumnDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Update column failed"),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Column", id: arg.columnId },
      ],
    }),
    deleteColumn: builder.mutation<MutationResult, DeleteColumnInput>({
      async queryFn(args) {
        try {
          await deleteColumnDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Delete column failed"),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Column", id: arg.columnId },
        { type: "Column", id: `LIST-${arg.boardId}` },
      ],
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
            error: error instanceof Error ? error : new Error("Create card failed"),
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
      invalidatesTags: (_result, _error, arg) => [
        { type: "Card", id: `LIST-${arg.boardId}` },
        { type: "Card", id: `LIST-${arg.boardId}-${arg.columnId}` },
      ],
    }),
    updateCard: builder.mutation<MutationResult, UpdateCardInput>({
      async queryFn(args) {
        try {
          await updateCardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Update card failed"),
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
      invalidatesTags: (_result, _error, arg) => [
        { type: "Card", id: arg.cardId },
        { type: "Card", id: `LIST-${arg.boardId}` },
        ...(arg.columnId
          ? [{ type: "Card" as const, id: `LIST-${arg.boardId}-${arg.columnId}` }]
          : []),
      ],
    }),
    deleteCard: builder.mutation<MutationResult, DeleteCardInput>({
      async queryFn(args) {
        try {
          await deleteCardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Delete card failed"),
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
      invalidatesTags: (_result, _error, arg) => [
        { type: "Card", id: arg.cardId },
        { type: "Card", id: `LIST-${arg.boardId}` },
      ],
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
