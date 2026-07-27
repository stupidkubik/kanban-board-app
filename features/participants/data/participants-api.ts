import { columnsApi } from "@/features/columns/data/columns-api"
import {
  updateBoardMemberRole as updateBoardMemberRoleDocument,
  type UpdateBoardMemberRoleInput,
} from "@/features/participants/data/participant-operations"
import { getErrorMessage } from "@/lib/errors"
import { subscribeToBoardMembers } from "@/lib/store/firestore-listeners"
import type { MutationResult } from "@/lib/store/firestore-api-types"
import type { BoardMemberProfile } from "@/lib/types/boards"

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
            error: new Error(
              getErrorMessage(error, "Update member role failed")
            ),
          }
        }
      },
    }),
  }),
})

export const {
  useGetBoardMembersQuery,
  useUpdateBoardMemberRoleMutation,
} = participantsApi
