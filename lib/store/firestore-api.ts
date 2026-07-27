import { cardsApi } from "@/features/cards/data/cards-api"
import {
  BOARD_CARD_LIMIT,
  BOARD_COLUMN_LIMIT,
  BOARD_MEMBER_LIMIT,
} from "@/lib/store/firestore-listeners"

export type { Invite } from "@/lib/store/firestore-normalizers"
export { BOARD_CARD_LIMIT, BOARD_COLUMN_LIMIT, BOARD_MEMBER_LIMIT }

export const firestoreApi = cardsApi

export const {
  useCreateBoardMutation,
  useCreateCardMutation,
  useCreateColumnMutation,
  useDeleteCardMutation,
  useDeleteBoardMutation,
  useDeleteColumnMutation,
  useGetBoardMembersQuery,
  useGetBoardQuery,
  useGetBoardsQuery,
  useGetCardsQuery,
  useGetColumnsQuery,
  useGetInvitesQuery,
  useUpdateCardMutation,
  useUpdateBoardTitleMutation,
  useUpdateColumnMutation,
  useUpdateBoardLanguageMutation,
} = firestoreApi
