import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import { firestoreBaseApi } from "@/lib/store/firestore-base-api"
import type {
  BoardQueryInput,
  BoardQueryState,
} from "@/lib/store/firestore-api-types"
import {
  subscribeToBoard,
  subscribeToBoards,
} from "@/lib/store/firestore-listeners"
import type { Board } from "@/lib/types/boards"

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
  }),
})
