export type AddCardDraft = {
  open: boolean
  title: string
  description: string
  due: string
  assigneeIds: string[]
  labelIds: string[]
}

export type EditingCardDraft = {
  id: string | null
  title: string
  description: string
  due: string
  assigneeIds: string[]
  labelIds: string[]
}

import type { BoardRoleLabel } from "@/lib/types/boards"

export type Participant = {
  id: string
  name: string
  secondaryLabel: string | null
  photoURL: string | null | undefined
  role: BoardRoleLabel
  isYou: boolean
}

export type CardAssignee = {
  id: string
  name: string
  email: string | null
  photoURL: string | null | undefined
}

export type BoardCopy = ReturnType<typeof import("@/lib/i18n").getCopy>
