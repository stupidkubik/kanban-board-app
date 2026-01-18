"use client"

import Image from "next/image"

import { getCopy, roleLabels, type Locale } from "@/lib/i18n"
import { type BoardRole } from "@/lib/types/boards"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import styles from "@/components/board-page.module.css"

export type Participant = {
  id: string
  name: string
  secondaryLabel: string | null
  photoURL: string | null | undefined
  role: "owner" | "editor" | "viewer" | "member"
  isYou: boolean
}

type ParticipantsSectionProps = {
  uiCopy: ReturnType<typeof getCopy>
  uiLocale: Locale
  participants: Participant[]
  isOwner: boolean
  inviteEmail: string
  inviteRole: BoardRole
  invitePending: boolean
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: BoardRole) => void
  onInviteSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export const ParticipantsSection = React.memo(function ParticipantsSection({
  uiCopy,
  uiLocale,
  participants,
  isOwner,
  inviteEmail,
  inviteRole,
  invitePending,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteSubmit,
}: ParticipantsSectionProps) {
  return (
    <Card className={styles.participantsCard} size="sm">
      <CardHeader>
        <CardTitle>{uiCopy.board.participantsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length ? (
          <>
            <ul className={styles.participantsList}>
              {participants.map((participant) => (
                <li key={participant.id} className={styles.participantRow}>
                  <div className={styles.participantIdentity}>
                    <div className={styles.participantAvatar}>
                      {participant.photoURL ? (
                        <Image
                          className={styles.participantAvatarImage}
                          src={participant.photoURL}
                          alt={participant.name}
                          width={36}
                          height={36}
                          unoptimized
                        />
                      ) : (
                        <span className={styles.participantAvatarFallback}>
                          {participant.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={styles.participantInfo}>
                      <div className={styles.participantNameRow}>
                        <span className={styles.participantName}>
                          {participant.name}
                        </span>
                        {participant.isYou ? (
                          <span className={styles.participantBadge}>
                            {uiCopy.board.youLabel}
                          </span>
                        ) : null}
                      </div>
                      {participant.secondaryLabel ? (
                        <span className={styles.participantSecondary}>
                          {participant.secondaryLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className={styles.participantRole}>
                    {roleLabels[uiLocale][participant.role]}
                  </span>
                </li>
              ))}
            </ul>
            {participants.length === 1 ? (
              <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
            ) : null}
            {isOwner ? (
              <form className={styles.inviteForm} onSubmit={onInviteSubmit}>
                <div className={styles.inviteLabel}>{uiCopy.board.inviteMember}</div>
                <div className={styles.inviteRow}>
                  <Input
                    className={styles.inviteInput}
                    value={inviteEmail}
                    onChange={(event) => onInviteEmailChange(event.target.value)}
                    placeholder={uiCopy.board.inviteEmailPlaceholder}
                    aria-label={uiCopy.board.inviteEmailPlaceholder}
                    type="email"
                    disabled={invitePending}
                  />
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => onInviteRoleChange(value as BoardRole)}
                    disabled={invitePending}
                  >
                    <SelectTrigger
                      size="sm"
                      className={styles.inviteSelect}
                      aria-label={uiCopy.board.roleLabel}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">
                        {roleLabels[uiLocale].editor}
                      </SelectItem>
                      <SelectItem value="viewer">
                        {roleLabels[uiLocale].viewer}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={invitePending}>
                    {invitePending
                      ? uiCopy.board.inviteSending
                      : uiCopy.board.inviteButton}
                  </Button>
                </div>
              </form>
            ) : null}
          </>
        ) : (
          <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
        )}
      </CardContent>
    </Card>
  )
})
