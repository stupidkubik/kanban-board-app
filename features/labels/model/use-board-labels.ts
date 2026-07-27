"use client"

import * as React from "react"

import { useGetBoardLabelsQuery } from "@/features/labels/data/labels-api"

export const useBoardLabels = (boardId: string | null) => {
  const { data: labels = [] } = useGetBoardLabelsQuery(boardId, {
    skip: !boardId,
  })
  const labelsById = React.useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels]
  )
  const labelIds = React.useMemo(
    () => new Set(labels.map((label) => label.id)),
    [labels]
  )
  return { labels, labelsById, labelIds }
}
