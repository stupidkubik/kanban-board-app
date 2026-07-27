import { invitesApi } from "@/features/invites/data/invites-api"
import { getErrorMessage } from "@/lib/errors"
import type { MutationResult } from "@/lib/store/firestore-api-types"
import {
  createColumn as createColumnDocument,
  deleteColumn as deleteColumnDocument,
  updateColumn as updateColumnDocument,
  type CreateColumnInput,
  type DeleteColumnInput,
  type UpdateColumnInput,
} from "@/lib/store/firestore-operations"
import { subscribeToColumns } from "@/lib/store/firestore-listeners"
import type { Column } from "@/lib/types/boards"

const mutationOk: MutationResult = { ok: true }

export const columnsApi = invitesApi.injectEndpoints({
  endpoints: (builder) => ({
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
              ...result.map((column) => ({
                type: "Column" as const,
                id: column.id,
              })),
            ]
          : [{ type: "Column" as const, id: listId }]
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
        const unsubscribe = subscribeToColumns(
          boardId,
          (nextColumns) => {
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
    createColumn: builder.mutation<MutationResult, CreateColumnInput>({
      async queryFn(args) {
        try {
          await createColumnDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Create column failed")),
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
            error: new Error(getErrorMessage(error, "Update column failed")),
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
            error: new Error(getErrorMessage(error, "Delete column failed")),
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
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useGetColumnsQuery,
  useUpdateColumnMutation,
} = columnsApi
