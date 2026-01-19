import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"

export type CreateCardInput = {
  boardId: string
  cardId?: string
  columnId: string
  title: string
  description?: string | null
  createdById: string
  order?: number
  assigneeIds?: string[]
  labels?: string[]
  dueAt?: Date | null
  archived?: boolean
}

export type UpdateCardInput = {
  boardId: string
  cardId: string
  columnId?: string
  title?: string
  description?: string | null
  order?: number
  assigneeIds?: string[]
  labels?: string[]
  dueAt?: Date | null
  archived?: boolean
}

export type DeleteCardInput = {
  boardId: string
  cardId: string
}

const buildCardUpdates = (input: UpdateCardInput) => {
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (typeof input.columnId === "string") {
    updates.columnId = input.columnId
  }
  if (typeof input.title === "string") {
    updates.title = input.title
  }
  if (typeof input.description === "string" || input.description === null) {
    updates.description = input.description
  }
  if (typeof input.order === "number") {
    updates.order = input.order
  }
  if (Array.isArray(input.assigneeIds)) {
    updates.assigneeIds = input.assigneeIds
  }
  if (Array.isArray(input.labels)) {
    updates.labels = input.labels
  }
  if (input.dueAt instanceof Date || input.dueAt === null) {
    updates.dueAt = input.dueAt
  }
  if (typeof input.archived === "boolean") {
    updates.archived = input.archived
  }

  return updates
}

export const createCard = async ({
  boardId,
  cardId,
  columnId,
  title,
  description,
  createdById,
  order,
  assigneeIds,
  labels,
  dueAt,
  archived,
}: CreateCardInput) => {
  const payload: Record<string, unknown> = {
    columnId,
    title,
    createdById,
    order: order ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (description !== undefined) {
    payload.description = description
  }
  if (assigneeIds !== undefined) {
    payload.assigneeIds = assigneeIds
  }
  if (labels !== undefined) {
    payload.labels = labels
  }
  if (dueAt !== undefined) {
    payload.dueAt = dueAt
  }
  if (archived !== undefined) {
    payload.archived = archived
  }

  const cardsCollection = collection(clientDb, "boards", boardId, "cards")
  const cardRef = cardId ? doc(cardsCollection, cardId) : doc(cardsCollection)
  await setDoc(cardRef, payload)
  return cardRef.id
}

export const updateCard = async (input: UpdateCardInput) => {
  await updateDoc(
    doc(clientDb, "boards", input.boardId, "cards", input.cardId),
    buildCardUpdates(input)
  )
}

export const deleteCard = async ({ boardId, cardId }: DeleteCardInput) => {
  await deleteDoc(doc(clientDb, "boards", boardId, "cards", cardId))
}
