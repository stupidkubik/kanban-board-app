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
