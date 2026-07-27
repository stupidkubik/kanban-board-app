import { columnsApi } from "@/features/columns/data/columns-api"
import { subscribeToBoardMembers } from "@/lib/store/firestore-listeners"
import type { BoardMemberProfile } from "@/lib/types/boards"

export const participantsApi = columnsApi.injectEndpoints({
  endpoints: (builder) => ({
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
              ...result.map((member) => ({
                type: "Member" as const,
                id: member.id,
              })),
            ]
          : [{ type: "Member" as const, id: listId }]
      },
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        if (!boardId) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
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
  }),
})

export const { useGetBoardMembersQuery } = participantsApi
