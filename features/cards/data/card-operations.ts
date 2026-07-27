import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { retryFirebaseWrite } from "@/lib/firebase/retry-write"
import { normalizeAssigneeIds } from "@/features/cards/model/card-assignees"
import { normalizeLabelIds } from "@/features/labels/model/label-normalizers"

export type CreateCardInput = {
  boardId: string
  cardId?: string
  columnId: string
  title: string
  description?: string | null
  createdById: string
  order?: number
  assigneeIds?: string[]
  labelIds?: string[]
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
  labelIds?: string[]
  dueAt?: Date | null
  archived?: boolean
}

export type DeleteCardInput = {
  boardId: string
  cardId: string
}

export type RebalanceCardOrdersInput = {
  boardId: string
  cards: Array<{ cardId: string; columnId: string; order: number }>
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
    updates.assigneeIds = normalizeAssigneeIds(input.assigneeIds)
  }
  if (Array.isArray(input.labelIds)) {
    updates.labelIds = normalizeLabelIds(input.labelIds)
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
  labelIds,
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
    payload.assigneeIds = normalizeAssigneeIds(assigneeIds)
  }
  if (labelIds !== undefined) {
    payload.labelIds = normalizeLabelIds(labelIds)
  }
  if (dueAt !== undefined) {
    payload.dueAt = dueAt
  }
  if (archived !== undefined) {
    payload.archived = archived
  }

  const cardsCollection = collection(clientDb, "boards", boardId, "cards")
  const cardRef = cardId ? doc(cardsCollection, cardId) : doc(cardsCollection)
  await retryFirebaseWrite(() => setDoc(cardRef, payload))
  return cardRef.id
}

export const updateCard = async (input: UpdateCardInput) => {
  await retryFirebaseWrite(() =>
    updateDoc(
      doc(clientDb, "boards", input.boardId, "cards", input.cardId),
      buildCardUpdates(input)
    )
  )
}

export const deleteCard = async ({ boardId, cardId }: DeleteCardInput) => {
  await retryFirebaseWrite(() =>
    deleteDoc(doc(clientDb, "boards", boardId, "cards", cardId))
  )
}

export const rebalanceCardOrders = async ({
  boardId,
  cards,
}: RebalanceCardOrdersInput) => {
  if (cards.length > 500) {
    throw new Error("Cannot rebalance more than 500 cards in one column")
  }
  const batch = writeBatch(clientDb)
  cards.forEach((card) => {
    batch.update(doc(clientDb, "boards", boardId, "cards", card.cardId), {
      columnId: card.columnId,
      order: card.order,
      updatedAt: serverTimestamp(),
    })
  })
  await retryFirebaseWrite(() => batch.commit())
}
