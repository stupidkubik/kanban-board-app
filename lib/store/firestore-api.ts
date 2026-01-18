import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react"
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import {
  createBoard as createBoardDocument,
  createCard as createCardDocument,
  createColumn as createColumnDocument,
  deleteBoard as deleteBoardDocument,
  deleteCard as deleteCardDocument,
  deleteColumn as deleteColumnDocument,
  updateBoardLanguage as updateBoardLanguageDocument,
  updateBoardTitle as updateBoardTitleDocument,
  updateCard as updateCardDocument,
  updateColumn as updateColumnDocument,
  type CreateBoardInput,
  type CreateCardInput,
  type CreateColumnInput,
  type DeleteBoardInput,
  type DeleteCardInput,
  type DeleteColumnInput,
  type UpdateCardInput,
  type UpdateBoardLanguageInput,
  type UpdateBoardTitleInput,
  type UpdateColumnInput,
} from "@/lib/store/firestore-operations"
import { optimisticCreateCard, optimisticDeleteCard, optimisticMoveCard } from "@/lib/store/optimistic-helpers"
import type { RootState } from "@/lib/store"
import type {
  Board,
  BoardMemberProfile,
  BoardRole,
  Card,
  Column,
} from "@/lib/types/boards"
import {
  ensureCardId,
  ensureCardOrder,
  memberFieldPath,
  normalizeBoard,
  normalizeCard,
  normalizeColumn,
  normalizeInvite,
  normalizeMemberProfile,
  type CardRecord,
  type ColumnRecord,
  type InviteRecord,
  type MemberProfileRecord,
} from "@/lib/store/firestore-normalizers"

export type Invite = {
  id: string
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedById: string
  createdAt?: number
}

type MutationResult = { ok: true }
type CreateBoardResult = MutationResult & { boardId: string }

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

        const memberField = memberFieldPath(uid)
        const boardsQuery = query(
          collection(clientDb, "boards"),
          where(memberField, "==", true)
        )

        const unsubscribe = onSnapshot(
          boardsQuery,
          (snapshot) => {
            const nextBoards = snapshot.docs.map((docSnap) =>
              normalizeBoard(docSnap.id, docSnap.data() as Omit<Board, "id">)
            )
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
    getBoard: builder.query<Board | null, string | null>({
      queryFn: async () => ({ data: null }),
      keepUnusedDataFor: 60,
      providesTags: (_result, _error, boardId) =>
        boardId
          ? [{ type: "Board" as const, id: boardId }]
          : [{ type: "Board" as const, id: "DETAIL" }],
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheEntryRemoved }
      ) {
        if (!boardId) {
          await cacheEntryRemoved
          return
        }

        const boardRef = doc(clientDb, "boards", boardId)

        const unsubscribe = onSnapshot(
          boardRef,
          (snapshot) => {
            updateCachedData(() => {
              if (!snapshot.exists()) {
                return null
              }
              return normalizeBoard(
                boardId,
                snapshot.data() as Omit<Board, "id"> & { createdBy?: string }
              )
            })
          },
          () => {
            updateCachedData(() => null)
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

        const normalizedEmail = email.toLowerCase()
        const invitesQuery = query(
          collection(clientDb, "boardInvites"),
          where("email", "==", normalizedEmail)
        )

        const unsubscribe = onSnapshot(
          invitesQuery,
          (snapshot) => {
            const nextInvites = snapshot.docs.map((docSnap) =>
              normalizeInvite(docSnap.id, docSnap.data() as InviteRecord)
            )
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

        const columnsQuery = query(
          collection(clientDb, "boards", boardId, "columns"),
          orderBy("order", "asc")
        )

        const unsubscribe = onSnapshot(
          columnsQuery,
          (snapshot) => {
            const nextColumns = snapshot.docs.map((docSnap) =>
              normalizeColumn(boardId, docSnap.id, docSnap.data() as ColumnRecord)
            )
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

        const membersQuery = query(
          collection(clientDb, "boards", boardId, "memberProfiles"),
          orderBy("joinedAt", "asc")
        )

        const unsubscribe = onSnapshot(
          membersQuery,
          (snapshot) => {
            const nextMembers = snapshot.docs.map((docSnap) =>
              normalizeMemberProfile(
                docSnap.id,
                docSnap.data() as MemberProfileRecord
              )
            )
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

        const cardsCollection = collection(
          clientDb,
          "boards",
          args.boardId,
          "cards"
        )
        const cardsQuery = args.columnId
          ? query(
              cardsCollection,
              where("columnId", "==", args.columnId),
              orderBy("order", "asc")
            )
          : query(cardsCollection, orderBy("order", "asc"))

        const unsubscribe = onSnapshot(
          cardsQuery,
          (snapshot) => {
            const nextCards = snapshot.docs.map((docSnap) =>
              normalizeCard(args.boardId, docSnap.id, docSnap.data() as CardRecord)
            )
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
          ensureCardId(args)
          ensureCardOrder(args)
          await createCardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Create card failed"),
          }
        }
      },
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        const cardId = ensureCardId(args)
        const order = ensureCardOrder(args)
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
