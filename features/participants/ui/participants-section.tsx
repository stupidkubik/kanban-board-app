"use client"

import * as React from "react"
import { UsersThree } from "@phosphor-icons/react"
import type { User } from "firebase/auth"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Board } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import type { Locale } from "@/lib/i18n"
import { useBoardParticipants } from "@/features/participants/model/use-board-participants"
import { ParticipantsSectionView, ParticipantsSummary } from "@/features/participants/ui/participants-section-view"
import styles from "@/features/participants/ui/participants.module.css"

type ParticipantsSectionProps = {
  boardId: string | null
  board: Board | null
  user: User | null
  isOwner: boolean
  uiCopy: BoardCopy
  uiLocale: Locale
  setError: (message: string | null) => void
}

export const ParticipantsSection = React.memo(function ParticipantsSection(props: ParticipantsSectionProps) {
  const {
    participants,
    inviteEmail,
    inviteRole,
    invitePending,
    removePendingId,
    rolePendingId,
    leavePending,
    setInviteEmail,
    setInviteRole,
    handleInvite,
    handleRemoveParticipant,
    handleUpdateParticipantRole,
    handleLeaveBoard,
  } = useBoardParticipants(props)

  if (!props.board) {
    return null
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={styles.managerTrigger} data-testid="participants-manager-trigger">
          <UsersThree weight="bold" aria-hidden="true" />
          <span>{props.uiCopy.board.participantsManager}</span>
          <ParticipantsSummary participants={participants} emptyLabel={props.uiCopy.board.onlyYou} />
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" className={styles.managerDialog}>
        <DialogHeader className={styles.managerHeader}>
          <DialogTitle>{props.uiCopy.board.participantsManager}</DialogTitle>
          <DialogDescription className="srOnly">{props.uiCopy.board.participantsTitle}</DialogDescription>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" data-testid="close-participants-manager">
              {props.uiCopy.common.cancel}
            </Button>
          </DialogClose>
        </DialogHeader>
        <ParticipantsSectionView
          uiCopy={props.uiCopy}
          uiLocale={props.uiLocale}
          participants={participants}
          isOwner={props.isOwner}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          invitePending={invitePending}
          removePendingId={removePendingId}
          rolePendingId={rolePendingId}
          leavePending={leavePending}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onInviteSubmit={handleInvite}
          onRemoveParticipant={handleRemoveParticipant}
          onUpdateParticipantRole={handleUpdateParticipantRole}
          onLeaveBoard={handleLeaveBoard}
        />
      </DialogContent>
    </Dialog>
  )
})
