import {
  createApi,
  fakeBaseQuery,
} from "@reduxjs/toolkit/query/react"
import {
  FieldPath,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
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
import type {
  Board,
  BoardMemberProfile,
  BoardRole,
  Column,
} from "@/lib/types/boards"

export type Invite = {
  id: string
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedById: string
  createdAt?: number
}

type InviteRecord = {
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedById?: string
  invitedBy?: string
  createdAt?: unknown
}

type ColumnRecord = {
  title: string
  order?: number
  createdAt?: unknown
  updatedAt?: unknown
}

type MemberProfileRecord = {
  displayName?: string | null
  photoURL?: string | null
  email?: string | null
  joinedAt?: unknown
}

type MutationResult = { ok: true }

const mutationOk: MutationResult = { ok: true }

const toMillis = (value: unknown): number | undefined => {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const maybeTimestamp = value as { toMillis?: () => number }
  if (typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis()
  }

  return undefined
}

const normalizeBoard = (id: string, data: Omit<Board, "id"> & { createdBy?: string }) => {
  const ownerId = data.ownerId ?? data.createdBy ?? ""
  const board: Board = {
    id,
    title: data.title,
    ownerId,
    members: data.members ?? {},
    roles: data.roles,
    language: data.language,
  }

  const createdAt = toMillis((data as { createdAt?: unknown }).createdAt)
  if (createdAt !== undefined) {
    board.createdAt = createdAt
  }

  const updatedAt = toMillis((data as { updatedAt?: unknown }).updatedAt)
  if (updatedAt !== undefined) {
    board.updatedAt = updatedAt
  }

  return board
}

const normalizeInvite = (id: string, data: InviteRecord) => {
  const invite: Invite = {
    id,
    boardId: data.boardId,
    boardTitle: data.boardTitle,
    email: data.email,
    role: data.role,
    invitedById: data.invitedById ?? data.invitedBy ?? "",
  }

  const createdAt = toMillis(data.createdAt)
  if (createdAt !== undefined) {
    invite.createdAt = createdAt
  }

  return invite
}

const normalizeMemberProfile = (id: string, data: MemberProfileRecord) => {
  const profile: BoardMemberProfile = {
    id,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    email: data.email ?? null,
  }

  const joinedAt = toMillis(data.joinedAt)
  if (joinedAt !== undefined) {
    profile.joinedAt = joinedAt
  }

  return profile
}

const normalizeColumn = (boardId: string, id: string, data: ColumnRecord): Column => {
  const column: Column = {
    id,
    boardId,
    title: data.title,
    order: typeof data.order === "number" ? data.order : 0,
  }

  const createdAt = toMillis(data.createdAt)
  if (createdAt !== undefined) {
    column.createdAt = createdAt
  }

  const updatedAt = toMillis(data.updatedAt)
  if (updatedAt !== undefined) {
    column.updatedAt = updatedAt
  }

  return column
}

export const firestoreApi = createApi({
  reducerPath: "firestoreApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Board", "Invite", "Column", "Member"],
  endpoints: (builder) => ({
    getBoards: builder.query<Board[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
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

        const memberField = new FieldPath("members", uid)
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
    createBoard: builder.mutation<MutationResult, CreateBoardInput>({
      async queryFn(args) {
        try {
          await createBoardDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: error instanceof Error ? error : new Error("Create board failed"),
          }
        }
      },
      invalidatesTags: [{ type: "Board", id: "LIST" }],
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
  }),
})

export const {
  useCreateBoardMutation,
  useCreateColumnMutation,
  useDeleteBoardMutation,
  useDeleteColumnMutation,
  useGetBoardMembersQuery,
  useGetBoardsQuery,
  useGetColumnsQuery,
  useGetInvitesQuery,
  useUpdateBoardTitleMutation,
  useUpdateColumnMutation,
  useUpdateBoardLanguageMutation,
} = firestoreApi
