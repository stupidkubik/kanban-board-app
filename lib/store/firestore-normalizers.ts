import { FieldPath, collection, doc } from "firebase/firestore"

import type { Board, BoardMemberProfile, BoardRole, Card, Column } from "@/lib/types/boards"
import { clientDb } from "@/lib/firebase/client"

export type Invite = {
  id: string
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedById: string
  createdAt?: number
}

export type InviteRecord = {
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedById?: string
  invitedBy?: string
  createdAt?: unknown
}

export type ColumnRecord = {
  title: string
  order?: number
  createdAt?: unknown
  updatedAt?: unknown
}

export type CardRecord = {
  columnId?: string
  title?: string
  description?: unknown
  order?: number
  createdById?: string
  createdBy?: string
  assigneeIds?: unknown
  labels?: unknown
  dueAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  archived?: boolean
}

export type MemberProfileRecord = {
  displayName?: string | null
  photoURL?: string | null
  email?: string | null
  joinedAt?: unknown
}

const toMillis = (value: unknown): number | undefined => {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const maybeTimestamp = value as { toMillis?: () => number }
  if (typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis()
  }

  return undefined
}

export const normalizeBoard = (id: string, data: Omit<Board, "id"> & { createdBy?: string }) => {
  const ownerId = data.ownerId ?? data.createdBy ?? ""
  const board: Board = {
    id,
    title: data.title,
    ownerId,
    members: data.members ?? {},
    roles: data.roles,
    language: data.language,
  }

  const createdAt = toMillis((data as { createdAt?: unknown }).createdAt)
  if (createdAt !== undefined) {
    board.createdAt = createdAt
  }

  const updatedAt = toMillis((data as { updatedAt?: unknown }).updatedAt)
  if (updatedAt !== undefined) {
    board.updatedAt = updatedAt
  }

  return board
}

export const normalizeInvite = (id: string, data: InviteRecord): Invite => {
  const invite: Invite = {
    id,
    boardId: data.boardId,
    boardTitle: data.boardTitle,
    email: data.email,
    role: data.role,
    invitedById: data.invitedById ?? data.invitedBy ?? "",
  }

  const createdAt = toMillis(data.createdAt)
  if (createdAt !== undefined) {
    invite.createdAt = createdAt
  }

  return invite
}

export const normalizeMemberProfile = (id: string, data: MemberProfileRecord) => {
  const profile: BoardMemberProfile = {
    id,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    email: data.email ?? null,
  }

  const joinedAt = toMillis(data.joinedAt)
  if (joinedAt !== undefined) {
    profile.joinedAt = joinedAt
  }

  return profile
}

export const normalizeColumn = (boardId: string, id: string, data: ColumnRecord): Column => {
  const column: Column = {
    id,
    boardId,
    title: data.title,
    order: typeof data.order === "number" ? data.order : 0,
  }

  const createdAt = toMillis(data.createdAt)
  if (createdAt !== undefined) {
    column.createdAt = createdAt
  }

  const updatedAt = toMillis(data.updatedAt)
  if (updatedAt !== undefined) {
    column.updatedAt = updatedAt
  }

  return column
}

export const normalizeCard = (boardId: string, id: string, data: CardRecord): Card => {
  const createdById =
    typeof data.createdById === "string"
      ? data.createdById
      : typeof data.createdBy === "string"
        ? data.createdBy
        : ""

  const card: Card = {
    id,
    boardId,
    columnId: data.columnId ?? "",
    title: data.title ?? "",
    order: typeof data.order === "number" ? data.order : 0,
    createdById,
  }

  if (typeof data.description === "string") {
    card.description = data.description
  }

  if (Array.isArray(data.assigneeIds)) {
    const assignees = data.assigneeIds.filter(
      (assignee): assignee is string => typeof assignee === "string"
    )
    if (assignees.length) {
      card.assigneeIds = assignees
    }
  }

  if (Array.isArray(data.labels)) {
    const labels = data.labels.filter(
      (label): label is string => typeof label === "string"
    )
    if (labels.length) {
      card.labels = labels
    }
  }

  const dueAt = toMillis(data.dueAt)
  if (dueAt !== undefined) {
    card.dueAt = dueAt
  }

  const createdAt = toMillis(data.createdAt)
  if (createdAt !== undefined) {
    card.createdAt = createdAt
  }

  const updatedAt = toMillis(data.updatedAt)
  if (updatedAt !== undefined) {
    card.updatedAt = updatedAt
  }

  if (typeof data.archived === "boolean") {
    card.archived = data.archived
  }

  return card
}

// Shared helper to avoid query recreation outside of firestore-api
export const memberFieldPath = (uid: string) => new FieldPath("members", uid)

export const ensureCardId = (boardId: string, cardId?: string) => {
  return (
    cardId ??
    doc(
      collection(clientDb, "boards", boardId, "cards")
    ).id
  )
}

export const ensureCardOrder = (order?: number) => {
  if (typeof order !== "number") {
    return Date.now()
  }
  return order
}
