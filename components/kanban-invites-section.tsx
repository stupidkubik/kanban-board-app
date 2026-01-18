"use client"

import { type User } from "firebase/auth"
import { deleteDoc, doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { getCopy, roleLabels, type Locale } from "@/lib/i18n"
import { type Invite } from "@/lib/store/firestore-api"
import { Button } from "@/components/ui/button"
import styles from "@/components/kanban-app.module.css"

type KanbanInvitesSectionProps = {
  invites: Invite[]
  onError: (message: string | null) => void
  uiCopy: ReturnType<typeof getCopy>
  uiLocale: Locale
  user: User
}

export function KanbanInvitesSection({
  invites,
  onError,
  uiCopy,
  uiLocale,
  user,
}: KanbanInvitesSectionProps) {
  if (!invites.length) {
    return null
  }

  const handleAcceptInvite = async (invite: Invite) => {
    onError(null)

    try {
      const boardRef = doc(clientDb, "boards", invite.boardId)
      const inviteRef = doc(clientDb, "boardInvites", invite.id)
      const batch = writeBatch(clientDb)

      batch.update(boardRef, {
        [`members.${user.uid}`]: true,
        [`roles.${user.uid}`]: invite.role,
      })
      batch.delete(inviteRef)

      await batch.commit()

      await setDoc(
        doc(clientDb, "boards", invite.boardId, "memberProfiles", user.uid),
        {
          displayName: user.displayName ?? null,
          email: user.email ?? null,
          photoURL: user.photoURL ?? null,
          joinedAt: serverTimestamp(),
        }
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : uiCopy.board.errors.acceptInviteFailed)
    }
  }

  const handleDeclineInvite = async (invite: Invite) => {
    onError(null)

    try {
      await deleteDoc(doc(clientDb, "boardInvites", invite.id))
    } catch (err) {
      onError(err instanceof Error ? err.message : uiCopy.board.errors.declineInviteFailed)
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{uiCopy.board.invitationsTitle}</h3>
        <p className={styles.cardSubtitle}>{uiCopy.board.invitationsSubtitle}</p>
      </div>
      <div className={styles.cardContent}>
        {invites.map((invite) => (
          <div key={invite.id} className={styles.boardCard}>
            <div>{invite.boardTitle}</div>
            <div className={styles.muted}>
              {uiCopy.board.roleLabel}: {roleLabels[uiLocale][invite.role]}
            </div>
            <div className={styles.row}>
              <Button onClick={() => handleAcceptInvite(invite)} type="button">
                {uiCopy.board.acceptInvite}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDeclineInvite(invite)}
                type="button"
              >
                {uiCopy.board.declineInvite}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
