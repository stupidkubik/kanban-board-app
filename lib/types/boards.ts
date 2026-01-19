export type BoardRole = "owner" | "editor" | "viewer"
export type BoardRoleLabel = BoardRole | "member"
export type BoardLanguage = "ru" | "en"

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
  labels?: string[]
  dueAt?: number
  createdAt?: number
  updatedAt?: number
  archived?: boolean
}
