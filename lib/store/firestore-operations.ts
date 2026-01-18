import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import type { BoardLanguage } from "@/lib/types/boards"

export type CreateBoardInput = {
  title: string
  ownerId: string
  language: BoardLanguage
  ownerDisplayName?: string | null
  ownerEmail?: string | null
  ownerPhotoURL?: string | null
}

export type UpdateBoardLanguageInput = {
  boardId: string
  language: BoardLanguage
}

export type UpdateBoardTitleInput = {
  boardId: string
  title: string
}

export type DeleteBoardInput = {
  boardId: string
}

export type CreateColumnInput = {
  boardId: string
  title: string
}

export type UpdateColumnInput = {
  boardId: string
  columnId: string
  title: string
}

export type DeleteColumnInput = {
  boardId: string
  columnId: string
}

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

const parseDeleteBoardError = async (response: Response) => {
  let message = "Delete board failed"
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload?.error) {
      message = payload.error
    }
  } catch {
    // ignore JSON parse errors
  }
  return message
}

export const createBoard = async ({
  title,
  ownerId,
  language,
  ownerDisplayName,
  ownerEmail,
  ownerPhotoURL,
}: CreateBoardInput) => {
  const boardRef = await addDoc(collection(clientDb, "boards"), {
    title,
    ownerId,
    members: {
      [ownerId]: true,
    },
    roles: {
      [ownerId]: "owner",
    },
    language,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(clientDb, "boards", boardRef.id, "memberProfiles", ownerId), {
    displayName: ownerDisplayName ?? null,
    email: ownerEmail ?? null,
    photoURL: ownerPhotoURL ?? null,
    joinedAt: serverTimestamp(),
  })

  return boardRef.id
}

export const updateBoardLanguage = async ({
  boardId,
  language,
}: UpdateBoardLanguageInput) => {
  await updateDoc(doc(clientDb, "boards", boardId), {
    language,
    updatedAt: serverTimestamp(),
  })
}

export const updateBoardTitle = async ({ boardId, title }: UpdateBoardTitleInput) => {
  await updateDoc(doc(clientDb, "boards", boardId), {
    title,
    updatedAt: serverTimestamp(),
  })
}

// Board deletion uses the API route so the server can cascade subcollection deletes.
export const deleteBoard = async ({ boardId }: DeleteBoardInput) => {
  const response = await fetch(`/api/boards/${boardId}`, {
    method: "DELETE",
    credentials: "same-origin",
  })
  if (!response.ok) {
    throw new Error(await parseDeleteBoardError(response))
  }
}

export const createColumn = async ({ boardId, title }: CreateColumnInput) => {
  await addDoc(collection(clientDb, "boards", boardId, "columns"), {
    title,
    order: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateColumn = async ({
  boardId,
  columnId,
  title,
}: UpdateColumnInput) => {
  await updateDoc(doc(clientDb, "boards", boardId, "columns", columnId), {
    title,
    updatedAt: serverTimestamp(),
  })
}

export const deleteColumn = async ({ boardId, columnId }: DeleteColumnInput) => {
  await deleteDoc(doc(clientDb, "boards", boardId, "columns", columnId))
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
