import { boardsApi } from "@/features/boards/data/boards-api"
import type { Invite } from "@/lib/store/firestore-normalizers"
import { subscribeToInvites } from "@/lib/store/firestore-listeners"
import {
  listenerKeys,
  runRetryableListener,
} from "@/lib/store/listener-lifecycle"

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
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }
      ) {
        if (!email) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
        await runRetryableListener({
          key: listenerKeys.invites(email),
          dispatch,
          cacheEntryRemoved,
          subscribe: (onListenerError) =>
            subscribeToInvites(
              email,
              (nextInvites) => {
                updateCachedData((draft) => {
                  draft.length = 0
                  draft.push(...nextInvites)
                })
              },
              (error) => {
                console.error("Failed to load invites", error)
                updateCachedData((draft) => {
                  draft.length = 0
                })
                onListenerError(error)
              }
            ),
        })
      },
    }),
  }),
})

export const { useGetInvitesQuery } = invitesApi
