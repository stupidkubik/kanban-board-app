import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import { getErrorMessage } from "@/lib/errors"
import { firestoreBaseApi } from "@/lib/store/firestore-base-api"
import type {
  BoardQueryInput,
  BoardQueryState,
  CreateBoardResult,
  MutationResult,
} from "@/lib/store/firestore-api-types"
import {
  createBoard as createBoardDocument,
  deleteBoard as deleteBoardDocument,
  updateBoardLanguage as updateBoardLanguageDocument,
  updateBoardTitle as updateBoardTitleDocument,
  type CreateBoardInput,
  type DeleteBoardInput,
  type UpdateBoardLanguageInput,
  type UpdateBoardTitleInput,
} from "@/lib/store/firestore-operations"
import {
  subscribeToBoard,
  subscribeToBoards,
} from "@/lib/store/firestore-listeners"
import type { Board } from "@/lib/types/boards"

const mutationOk: MutationResult = { ok: true }

export const boardsApi = firestoreBaseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Firestore listeners drive the cache; queryFn is a stub and onCacheEntryAdded updates it.
    getBoards: builder.query<Board[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 60,
      providesTags: (result) =>
        result
          ? [
              { type: "Board" as const, id: "LIST" },
              ...result.map((board) => ({
                type: "Board" as const,
                id: board.id,
              })),
            ]
          : [{ type: "Board" as const, id: "LIST" }],
      async onCacheEntryAdded(
        uid,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        if (!uid) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
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
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        if (!args.boardId) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
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
    createBoard: builder.mutation<CreateBoardResult, CreateBoardInput>({
      async queryFn(args) {
        try {
          const boardId = await createBoardDocument(args)
          return { data: { ...mutationOk, boardId } }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Create board failed")),
          }
        }
      },
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const createdAt = Date.now()
          dispatch(
            boardsApi.util.updateQueryData(
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
    updateBoardLanguage: builder.mutation<
      MutationResult,
      UpdateBoardLanguageInput
    >({
      async queryFn(args) {
        try {
          await updateBoardLanguageDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(
              getErrorMessage(error, "Update board language failed")
            ),
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
            error: new Error(getErrorMessage(error, "Update board title failed")),
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
            error: new Error(getErrorMessage(error, "Delete board failed")),
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Board", id: arg.boardId },
        { type: "Board", id: "LIST" },
      ],
    }),
  }),
})
