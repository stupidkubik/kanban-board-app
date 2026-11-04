"use client"

import * as React from "react"
import { sendEmailVerification, type User } from "firebase/auth"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import { getCopy } from "@/lib/i18n"
import styles from "@/features/home/ui/kanban-app.module.css"

type EmailVerificationNoticeProps = {
  uiCopy: ReturnType<typeof getCopy>
  user: User
}

export function EmailVerificationNotice({
  uiCopy,
  user,
}: EmailVerificationNoticeProps) {
  const { notifyError, notifySuccess } = useNotifications()
  const [pending, setPending] = React.useState<"resend" | "check" | null>(null)

  const handleResend = async () => {
    setPending("resend")
    try {
      await sendEmailVerification(user)
      notifySuccess(uiCopy.board.verifyEmailSent)
    } catch {
      notifyError(uiCopy.board.verifyEmailResendFailed)
    } finally {
      setPending(null)
    }
  }

  const handleCheck = async () => {
    setPending("check")
    try {
      await user.reload()
      if (!user.emailVerified) {
        notifyError(uiCopy.board.verifyEmailPending)
        return
      }
      // A fresh ID token carries `email_verified: true` for Firestore rules
      // and makes AuthProvider publish the new state.
      await user.getIdToken(true)
    } catch {
      notifyError(uiCopy.board.verifyEmailPending)
    } finally {
      setPending(null)
    }
  }

  return (
    <Card asChild className={styles.card}>
      <section data-testid="verify-email-notice">
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{uiCopy.board.verifyEmailTitle}</h3>
          <p className={styles.cardSubtitle}>
            {uiCopy.board.verifyEmailDescription}
          </p>
        </div>
        <div className={styles.cardContent}>
          <div>{user.email}</div>
          <div className={styles.row}>
            <Button
              type="button"
              onClick={handleCheck}
              disabled={pending !== null}
            >
              {uiCopy.board.verifyEmailCheck}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={pending !== null}
            >
              {uiCopy.board.verifyEmailResend}
            </Button>
          </div>
        </div>
      </section>
    </Card>
  )
}
