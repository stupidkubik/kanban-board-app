"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { useGetBoardMembersQuery } from "@/lib/store/firestore-api"
import { clientDb } from "@/lib/firebase/client"
import type { Board, BoardRole, BoardRoleLabel } from "@/lib/types/boards"
import type { BoardCopy, Participant } from "@/lib/types/board-ui"
import { isValidEmail } from "@/lib/validation"

type UseBoardParticipantsParams = {
  boardId: string | null
  board: Board | null
  user: User | null
  isOwner: boolean
  uiCopy: BoardCopy
  setError: (message: string | null) => void
}

type UseBoardParticipantsResult = {
  participants: Participant[]
  inviteEmail: string
  inviteRole: BoardRole
  invitePending: boolean
  setInviteEmail: (value: string) => void
  setInviteRole: (role: BoardRole) => void
  handleInvite: (event: React.FormEvent<HTMLFormElement>) => void
}

export function useBoardParticipants({
  boardId,
  board,
  user,
  isOwner,
  uiCopy,
  setError,
}: UseBoardParticipantsParams): UseBoardParticipantsResult {
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<BoardRole>("editor")
  const [invitePending, setInvitePending] = React.useState(false)

  const { data: memberProfiles = [] } = useGetBoardMembersQuery(boardId ?? null, {
    skip: !boardId,
  })

  const memberProfilesById = React.useMemo(() => {
    return new Map(memberProfiles.map((member) => [member.id, member]))
  }, [memberProfiles])

  const participants = React.useMemo<Participant[]>(() => {
    if (!board) {
      return []
    }

    return Object.entries(board.members)
      .filter(([, isMember]) => isMember)
      .map(([memberId]) => {
        const profile = memberProfilesById.get(memberId)
        const isYou = memberId === user?.uid
        const displayName =
          profile?.displayName ?? (isYou ? user?.displayName : null)
        const email = profile?.email ?? (isYou ? user?.email : null)
        const photoURL =
          profile?.photoURL ?? (isYou ? user?.photoURL : null)
        const roleKey: BoardRoleLabel =
          board.roles?.[memberId] ?? (memberId === board.ownerId ? "owner" : "member")

        return {
          id: memberId,
          name: displayName || email || memberId,
          secondaryLabel:
            displayName && email && displayName !== email ? email : null,
          photoURL,
          role: roleKey,
          isYou,
        }
      })
  }, [
    board,
    memberProfilesById,
    user?.displayName,
    user?.email,
    user?.photoURL,
    user?.uid,
  ])

  const handleInvite = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!board) {
      return
    }

    if (!user) {
      setError(uiCopy.board.errors.signInToInvite)
      return
    }

    if (!isOwner) {
      setError(uiCopy.board.errors.onlyOwnerCanInvite)
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError(uiCopy.board.errors.inviteInvalidEmail)
      return
    }

    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      setError(uiCopy.board.errors.inviteSelf)
      return
    }

    setError(null)
    setInvitePending(true)

    try {
      const inviteId = `${board.id}__${normalizedEmail}`
      await setDoc(doc(clientDb, "boardInvites", inviteId), {
        boardId: board.id,
        boardTitle: board.title,
        email: normalizedEmail,
        role: inviteRole,
        invitedById: user.uid,
        createdAt: serverTimestamp(),
      })
      setInviteEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.inviteFailed)
    } finally {
      setInvitePending(false)
    }
  }, [
    board,
    inviteEmail,
    inviteRole,
    isOwner,
    setError,
    uiCopy.board.errors.inviteFailed,
    uiCopy.board.errors.inviteInvalidEmail,
    uiCopy.board.errors.inviteSelf,
    uiCopy.board.errors.onlyOwnerCanInvite,
    uiCopy.board.errors.signInToInvite,
    user,
  ])

  return {
    participants,
    inviteEmail,
    inviteRole,
    invitePending,
    setInviteEmail,
    setInviteRole,
    handleInvite,
  }
}
