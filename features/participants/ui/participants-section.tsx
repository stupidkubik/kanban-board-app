"use client"

import * as React from "react"
import type { User } from "firebase/auth"

import type { Board } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import type { Locale } from "@/lib/i18n"
import { useBoardParticipants } from "@/features/participants/model/use-board-participants"
import { ParticipantsSectionView } from "@/features/participants/ui/participants-section-view"

type ParticipantsSectionProps = {
  boardId: string | null
  board: Board | null
  user: User | null
  isOwner: boolean
  uiCopy: BoardCopy
  uiLocale: Locale
  setError: (message: string | null) => void
}

export const ParticipantsSection = React.memo(function ParticipantsSection({
  boardId,
  board,
  user,
  isOwner,
  uiCopy,
  uiLocale,
  setError,
}: ParticipantsSectionProps) {
  const {
    participants,
    inviteEmail,
    inviteRole,
    invitePending,
    setInviteEmail,
    setInviteRole,
    handleInvite,
  } = useBoardParticipants({
    boardId,
    board,
    user,
    isOwner,
    uiCopy,
    setError,
  })

  if (!board) {
    return null
  }

  return (
    <ParticipantsSectionView
      uiCopy={uiCopy}
      uiLocale={uiLocale}
      participants={participants}
      isOwner={isOwner}
      inviteEmail={inviteEmail}
      inviteRole={inviteRole}
      invitePending={invitePending}
      onInviteEmailChange={setInviteEmail}
      onInviteRoleChange={setInviteRole}
      onInviteSubmit={handleInvite}
    />
  )
})
