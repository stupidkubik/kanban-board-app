import { collection, doc } from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { toMillis } from "@/lib/firestore-values"
import type { Card } from "@/lib/types/boards"

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

export const isVisibleCard = (card: Card) => card.archived !== true

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
