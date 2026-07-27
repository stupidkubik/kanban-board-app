import { participantsApi } from "@/features/participants/data/participants-api"
import {
  createBoardLabel as createBoardLabelDocument,
  deleteBoardLabel as deleteBoardLabelDocument,
  updateBoardLabel as updateBoardLabelDocument,
  type CreateBoardLabelInput,
  type DeleteBoardLabelInput,
  type UpdateBoardLabelInput,
} from "@/features/labels/data/label-operations"
import { getErrorMessage } from "@/lib/errors"
import { subscribeToBoardLabels } from "@/lib/store/firestore-listeners"
import type { MutationResult } from "@/lib/store/firestore-api-types"
import type { BoardLabel } from "@/lib/types/boards"

const mutationOk: MutationResult = { ok: true }

export const labelsApi = participantsApi.injectEndpoints({
  endpoints: (builder) => ({
    getBoardLabels: builder.query<BoardLabel[], string | null>({
      queryFn: async () => ({ data: [] }),
      keepUnusedDataFor: 0,
      providesTags: (result, _error, boardId) => [
        { type: "Label" as const, id: `LIST-${boardId ?? "none"}` },
        ...(result ?? []).map((label) => ({
          type: "Label" as const,
          id: label.id,
        })),
      ],
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        if (!boardId) {
          await cacheEntryRemoved
          return
        }
        await cacheDataLoaded
        const unsubscribe = subscribeToBoardLabels(
          boardId,
          (labels) => {
            updateCachedData((draft) => {
              draft.length = 0
              draft.push(...labels)
            })
          },
          (error) => {
            console.error("Failed to load board labels", error)
            updateCachedData((draft) => {
              draft.length = 0
            })
          }
        )
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createBoardLabel: builder.mutation<MutationResult, CreateBoardLabelInput>({
      async queryFn(args) {
        try {
          await createBoardLabelDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Create label failed")),
          }
        }
      },
    }),
    updateBoardLabel: builder.mutation<MutationResult, UpdateBoardLabelInput>({
      async queryFn(args) {
        try {
          await updateBoardLabelDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Update label failed")),
          }
        }
      },
    }),
    deleteBoardLabel: builder.mutation<MutationResult, DeleteBoardLabelInput>({
      async queryFn(args) {
        try {
          await deleteBoardLabelDocument(args)
          return { data: mutationOk }
        } catch (error) {
          return {
            error: new Error(getErrorMessage(error, "Delete label failed")),
          }
        }
      },
    }),
  }),
})

export const {
  useCreateBoardLabelMutation,
  useDeleteBoardLabelMutation,
  useGetBoardLabelsQuery,
  useUpdateBoardLabelMutation,
} = labelsApi
