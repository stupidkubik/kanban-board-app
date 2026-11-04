import { participantsApi } from "@/features/participants/data/participants-api"
import { subscribeToCards } from "@/lib/store/firestore-listeners"
import type { Card } from "@/lib/types/boards"
import {
  listenerKeys,
  runRetryableListener,
} from "@/lib/store/listener-lifecycle"

export const cardQueriesApi = participantsApi.injectEndpoints({
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
              ...result.map((card) => ({
                type: "Card" as const,
                id: card.id,
              })),
            ]
          : [{ type: "Card" as const, id: listId }]
      },
      async onCacheEntryAdded(
        args,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }
      ) {
        if (!args?.boardId) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
        await runRetryableListener({
          key: listenerKeys.cards(args.boardId),
          dispatch,
          cacheEntryRemoved,
          subscribe: (onListenerError) =>
            subscribeToCards(
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
                onListenerError(error)
              }
            ),
        })
      },
    }),
  }),
})

export const { useGetCardsQuery } = cardQueriesApi
