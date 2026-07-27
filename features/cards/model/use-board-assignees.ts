"use client"

import * as React from "react"
import type { User } from "firebase/auth"

import { useGetBoardMembersQuery } from "@/features/participants/data/participants-api"
import { buildCardAssignees } from "@/features/cards/model/card-assignees"
import type { Board } from "@/lib/types/boards"

export const useBoardAssignees = (
  board: Board | null,
  user: User | null
) => {
  const { data: profiles = [] } = useGetBoardMembersQuery(board?.id ?? null, {
    skip: !board?.id,
  })
  const assignees = React.useMemo(
    () => buildCardAssignees(board, profiles, user),
    [board, profiles, user]
  )
  const assigneesById = React.useMemo(
    () => new Map(assignees.map((assignee) => [assignee.id, assignee])),
    [assignees]
  )
  const assigneeIds = React.useMemo(
    () => new Set(assignees.map((assignee) => assignee.id)),
    [assignees]
  )

  return { assignees, assigneesById, assigneeIds }
}
