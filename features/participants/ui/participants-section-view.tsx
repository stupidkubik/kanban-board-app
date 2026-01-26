"use client"

import * as React from "react"
import Image from "next/image"
import { TrashSimple } from "@phosphor-icons/react"

import { getCopy, roleLabels, type Locale } from "@/lib/i18n"
import { type BoardRole } from "@/lib/types/boards"
import { type Participant } from "@/lib/types/board-ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import styles from "@/features/board/ui/board-page.module.css"

type ParticipantsSectionViewProps = {
  uiCopy: ReturnType<typeof getCopy>
  uiLocale: Locale
  participants: Participant[]
  isOwner: boolean
  inviteEmail: string
  inviteRole: BoardRole
  invitePending: boolean
  removePendingId: string | null
  leavePending: boolean
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: BoardRole) => void
  onInviteSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onRemoveParticipant: (participantId: string) => void
  onLeaveBoard: () => void
}

export const ParticipantsSectionView = React.memo(function ParticipantsSectionView({
  uiCopy,
  uiLocale,
  participants,
  isOwner,
  inviteEmail,
  inviteRole,
  invitePending,
  removePendingId,
  leavePending,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteSubmit,
  onRemoveParticipant,
  onLeaveBoard,
}: ParticipantsSectionViewProps) {
  const [open, setOpen] = React.useState(isOwner)
  const visibleParticipants = participants.slice(0, 5)
  const remainingCount = participants.length - visibleParticipants.length

  React.useEffect(() => {
    if (isOwner) {
      setOpen(true)
    }
  }, [isOwner])

  return (
    <Card className={styles.participantsCard} size="sm">
      <CardHeader className={styles.participantsHeader}>
        <div className={styles.participantsHeaderMain}>
          <CardTitle>{uiCopy.board.participantsTitle}</CardTitle>
          <div className={styles.participantsSummary}>
            {participants.length ? (
              <div className={styles.participantAvatarStack}>
                {visibleParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`${styles.participantAvatar} ${styles.participantAvatarCompact}`}
                    title={participant.name}
                  >
                    {participant.photoURL ? (
                      <Image
                        className={styles.participantAvatarImage}
                        src={participant.photoURL}
                        alt={participant.name}
                        width={28}
                        height={28}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.participantAvatarFallback}>
                        {participant.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {remainingCount > 0 ? (
                  <div
                    className={`${styles.participantAvatar} ${styles.participantAvatarCompact} ${styles.participantAvatarOverflow}`}
                  >
                    +{remainingCount}
                  </div>
                ) : null}
              </div>
            ) : (
              <span className={styles.participantsSummaryEmpty}>
                {uiCopy.board.onlyYou}
              </span>
            )}
          </div>
        </div>
        <div className={styles.participantsHeaderActions}>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? uiCopy.board.participantsHide : uiCopy.board.participantsShow}
          </Button>
          {isOwner ? (
            <Button
              type="button"
              size="xs"
              onClick={() => setOpen(true)}
            >
              {uiCopy.board.inviteMember}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={styles.leaveBoardButton}
                  disabled={leavePending}
                >
                  {leavePending ? (
                    <Spinner size="xs" className={styles.buttonSpinner} aria-hidden="true" />
                  ) : null}
                  {uiCopy.board.leaveBoard}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{uiCopy.board.leaveBoardTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {uiCopy.board.leaveBoardDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">
                    {uiCopy.common.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    variant="destructive"
                    disabled={leavePending}
                    onClick={onLeaveBoard}
                  >
                    {uiCopy.board.leaveBoardConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      {open ? (
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
                            <Badge variant="outline" className={styles.participantBadge}>
                              {uiCopy.board.youLabel}
                            </Badge>
                          ) : null}
                        </div>
                        {participant.secondaryLabel ? (
                          <span className={styles.participantSecondary}>
                            {participant.secondaryLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.participantActions}>
                      <Badge variant="outline" className={styles.participantRole}>
                        {roleLabels[uiLocale][participant.role]}
                      </Badge>
                      {isOwner &&
                      !participant.isYou &&
                      participant.role !== "owner" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={styles.participantRemoveButton}
                              disabled={removePendingId === participant.id}
                              aria-label={uiCopy.board.removeMember}
                            >
                              {removePendingId === participant.id ? (
                                <Spinner size="xs" aria-hidden="true" />
                              ) : (
                                <TrashSimple weight="bold" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {uiCopy.board.removeMemberTitle}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {uiCopy.board.removeMemberDescription}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel type="button">
                                {uiCopy.common.cancel}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                type="button"
                                variant="destructive"
                                disabled={removePendingId === participant.id}
                                onClick={() => onRemoveParticipant(participant.id)}
                              >
                                {uiCopy.board.removeMemberConfirm}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {participants.length === 1 ? (
                <p className={styles.participantsEmpty}>{uiCopy.board.onlyYou}</p>
              ) : null}
              {isOwner ? (
                <form className={styles.inviteForm} onSubmit={onInviteSubmit}>
                  <Label className={styles.inviteLabel} htmlFor="invite-email">
                    {uiCopy.board.inviteMember}
                  </Label>
                  <div className={styles.inviteRow}>
                    <Input
                      id="invite-email"
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
                      {invitePending ? (
                        <Spinner
                          size="sm"
                          className={styles.buttonSpinner}
                          aria-hidden="true"
                        />
                      ) : null}
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
      ) : null}
    </Card>
  )
})
