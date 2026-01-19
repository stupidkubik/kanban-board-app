export type AddCardDraft = {
  open: boolean
  title: string
  description: string
  due: string
}

export type EditingCardDraft = {
  id: string | null
  title: string
  description: string
  due: string
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

export type BoardCopy = ReturnType<typeof import("@/lib/i18n").getCopy>
