import type { Locale } from "@/lib/i18n"

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

export type Participant = {
  id: string
  name: string
  secondaryLabel: string | null
  photoURL: string | null | undefined
  role: "owner" | "editor" | "viewer" | "member"
  isYou: boolean
}

export type BoardCopy = ReturnType<typeof import("@/lib/i18n").getCopy>
