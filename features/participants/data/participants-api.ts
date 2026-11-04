import { columnsApi } from "@/features/columns/data/columns-api"
import {
  updateBoardMemberRole as updateBoardMemberRoleDocument,
  type UpdateBoardMemberRoleInput,
} from "@/features/participants/data/participant-operations"
import { serializeError } from "@/lib/errors"
import { subscribeToBoardMembers } from "@/lib/store/firestore-listeners"
import type { MutationResult } from "@/lib/store/firestore-api-types"
import type { BoardMemberProfile } from "@/lib/types/boards"
import {
  listenerKeys,
  runRetryableListener,
} from "@/lib/store/listener-lifecycle"

const mutationOk: MutationResult = { ok: true }

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
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }
      ) {
        if (!boardId) {
          await cacheEntryRemoved
          return
        }

        await cacheDataLoaded
        await runRetryableListener({
          key: listenerKeys.members(boardId),
          dispatch,
          cacheEntryRemoved,
          subscribe: (onListenerError) =>
            subscribeToBoardMembers(
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
                onListenerError(error)
              }
            ),
        })
      },
    }),
    updateBoardMemberRole: builder.mutation<
      MutationResult,
      UpdateBoardMemberRoleInput
    >({
      async queryFn(args) {
        try {
          await updateBoardMemberRoleDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: serializeError(error, "Update member role failed"),
          }
        }
      },
    }),
  }),
})

export const { useGetBoardMembersQuery, useUpdateBoardMemberRoleMutation } =
  participantsApi
