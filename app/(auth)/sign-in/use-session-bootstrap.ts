"use client"

import * as React from "react"
import { FirebaseError } from "firebase/app"
import type { User } from "firebase/auth"

import { getFriendlyAuthError } from "./auth-error"
import { refreshServerSession } from "@/lib/firebase/app-check-fetch"
import type { getCopy } from "@/lib/i18n"

// The sign-in page remounts after every redirect from the protected layout.
// If the server keeps rejecting the cookie it just issued (clock skew, an
// http deploy without Secure, a revoked session), each mount would POST and
// redirect again. Attempts are counted per user at module level, which
// survives client-side redirects but not a full reload.
const MAX_ATTEMPTS = 2
const ATTEMPT_WINDOW_MS = 60_000
let recentAttempts: { uid: string; times: number[] } | null = null

const recordAttempt = (uid: string) => {
  const now = Date.now()
  const times =
    recentAttempts?.uid === uid
      ? recentAttempts.times.filter((time) => now - time < ATTEMPT_WINDOW_MS)
      : []
  recentAttempts = { uid, times: [...times, now] }
  return recentAttempts.times.length
}

export const resetSessionBootstrapAttempts = () => {
  recentAttempts = null
}

type UseSessionBootstrapArgs = {
  loading: boolean
  user: User | null
  router: { replace: (href: string) => void }
  errors: ReturnType<typeof getCopy>["auth"]["errors"]
  setError: (message: string | null) => void
}

export const useSessionBootstrap = ({
  loading,
  user,
  router,
  errors,
  setError,
}: UseSessionBootstrapArgs) => {
  const [sessionPending, setSessionPending] = React.useState(false)
  const [sessionFailed, setSessionFailed] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)
  const syncedUserIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (loading) {
      return
    }
    if (!user) {
      syncedUserIdRef.current = null
      return
    }
    if (syncedUserIdRef.current === user.uid) {
      return
    }

    syncedUserIdRef.current = user.uid
    const attemptsExhausted = recordAttempt(user.uid) > MAX_ATTEMPTS

    const syncSession = async () => {
      if (attemptsExhausted) {
        setSessionFailed(true)
        setError(errors.sessionRejected)
        return
      }
      setSessionFailed(false)
      setSessionPending(true)
      try {
        await refreshServerSession({
          forceRefresh: true,
          forceSession: true,
        })
        router.replace("/")
      } catch (error) {
        setSessionFailed(true)
        setError(
          error instanceof FirebaseError
            ? getFriendlyAuthError(error, errors)
            : errors.sessionError
        )
      } finally {
        setSessionPending(false)
      }
    }

    void syncSession()
  }, [errors, loading, retryCount, router, setError, user])

  const retrySession = React.useCallback(() => {
    resetSessionBootstrapAttempts()
    syncedUserIdRef.current = null
    setError(null)
    setSessionFailed(false)
    setRetryCount((count) => count + 1)
  }, [setError])

  return { sessionPending, sessionFailed, retrySession }
}
