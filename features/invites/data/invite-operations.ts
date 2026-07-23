import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import type { BoardRole } from "@/lib/types/boards"

type CreateBoardInviteInput = {
  boardId: string
  boardTitle: string
  email: string
  role: BoardRole
  invitedById: string
}

export function createBoardInvite({
  boardId,
  boardTitle,
  email,
  role,
  invitedById,
}: CreateBoardInviteInput) {
  const inviteId = `${boardId}__${email}`
  return setDoc(doc(clientDb, "boardInvites", inviteId), {
    boardId,
    boardTitle,
    email,
    role,
    invitedById,
    createdAt: serverTimestamp(),
  })
}

export function declineBoardInvite(inviteId: string) {
  return deleteDoc(doc(clientDb, "boardInvites", inviteId))
}
