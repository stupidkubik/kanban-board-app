export type BoardRole = "owner" | "editor" | "viewer"
export type BoardRoleLabel = BoardRole | "member"
export type BoardLanguage = "ru" | "en"
export const BOARD_LABEL_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const
export type BoardLabelColor = (typeof BOARD_LABEL_COLORS)[number]

export type BoardMemberProfile = {
  id: string
  displayName?: string | null
  photoURL?: string | null
  email?: string | null
  joinedAt?: number
}

export type Board = {
  id: string
  title: string
  ownerId: string
  members: Record<string, boolean>
  roles?: Record<string, BoardRole>
  labelIds?: Record<string, boolean>
  labelNames?: Record<string, string>
  language?: BoardLanguage
  createdAt?: number
  updatedAt?: number
}

export type Column = {
  id: string
  boardId: string
  title: string
  order: number
  createdAt?: number
  updatedAt?: number
}

export type Card = {
  id: string
  boardId: string
  columnId: string
  title: string
  description?: string
  order: number
  createdById: string
  assigneeIds?: string[]
  labelIds?: string[]
  /** Legacy name-based labels, read-only until migration completes. */
  labels?: string[]
  dueAt?: number
  createdAt?: number
  updatedAt?: number
  archived?: boolean
}

export type BoardLabel = {
  id: string
  boardId: string
  name: string
  normalizedName: string
  color: BoardLabelColor
  order: number
  createdAt?: number
  updatedAt?: number
}
