"use client"

import { useGetCardsQuery } from "@/features/cards/data/card-queries-api"
import { projectCards } from "@/features/cards/model/card-projection"

export const useBoardCardQuery = (boardId: string | null) =>
  useGetCardsQuery(boardId ? { boardId } : null, {
    skip: !boardId,
    selectFromResult: ({ data, isLoading, isFetching }) => ({
      ...projectCards(data),
      isCardsLoading: isLoading || isFetching,
    }),
  })
