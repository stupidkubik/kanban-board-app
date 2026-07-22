import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import type { BoardLanguage } from "@/lib/types/boards"

export type CreateBoardInput = {
  boardId?: string
  title: string
  ownerId: string
  language: BoardLanguage
  ownerDisplayName?: string | null
  ownerEmail?: string | null
  ownerPhotoURL?: string | null
}

export type AcceptBoardInviteInput = {
  inviteId: string
  boardId: string
  displayName?: string | null
  email?: string | null
  photoURL?: string | null
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

export type DeleteBoardMemberInput = {
  boardId: string
  memberId: string
}

export const COLUMN_NOT_EMPTY = "COLUMN_NOT_EMPTY"

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
  boardId,
  title,
  language,
  ownerDisplayName,
  ownerEmail,
  ownerPhotoURL,
}: CreateBoardInput) => {
  const requestedBoardId = boardId ?? doc(collection(clientDb, "boards")).id
  const response = await fetchWithAppCheck("/api/boards", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardId: requestedBoardId,
      title,
      language,
      displayName: ownerDisplayName,
      email: ownerEmail,
      photoURL: ownerPhotoURL,
    }),
  })

  if (!response.ok) {
    let message = "Create board failed"
    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep the fallback error when the server does not return JSON.
    }
    throw new Error(message)
  }

  return requestedBoardId
}

export const acceptBoardInvite = async ({
  inviteId,
  boardId,
  displayName,
  email,
  photoURL,
}: AcceptBoardInviteInput) => {
  const response = await fetchWithAppCheck(
    `/api/invites/${encodeURIComponent(inviteId)}/accept`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, displayName, email, photoURL }),
    }
  )

  if (!response.ok) {
    let message = "Accept invite failed"
    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep the fallback error when the server does not return JSON.
    }
    throw new Error(message)
  }
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
  const response = await fetchWithAppCheck(`/api/boards/${boardId}`, {
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
  const response = await fetchWithAppCheck(
    `/api/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}`,
    {
      method: "DELETE",
      credentials: "same-origin",
    }
  )

  if (!response.ok) {
    let message = "Delete column failed"
    try {
      const payload = (await response.json()) as { code?: string; error?: string }
      message = payload.code ?? payload.error ?? message
    } catch {
      // Keep the fallback error when the server does not return JSON.
    }
    throw new Error(message)
  }
}

export const deleteBoardMember = async ({
  boardId,
  memberId,
}: DeleteBoardMemberInput) => {
  const response = await fetchWithAppCheck(
    `/api/boards/${encodeURIComponent(boardId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
      credentials: "same-origin",
    }
  )

  if (!response.ok) {
    let message = "Delete board member failed"
    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep the fallback error when the server does not return JSON.
    }
    throw new Error(message)
  }
}
