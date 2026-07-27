import { boardsApi } from "@/features/boards/data/boards-api"
import type { Invite } from "@/lib/store/firestore-normalizers"
import { subscribeToInvites } from "@/lib/store/firestore-listeners"

export const invitesApi = boardsApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvites: builder.query<Invite[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
      providesTags: (result) =>
        result
          ? [
              { type: "Invite" as const, id: "LIST" },
              ...result.map((invite) => ({
                type: "Invite" as const,
                id: invite.id,
              })),
            ]
          : [{ type: "Invite" as const, id: "LIST" }],
      async onCacheEntryAdded(
        email,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        if (!email) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
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
  }),
})
