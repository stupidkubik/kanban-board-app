"use client"

import * as React from "react"
import { FirebaseError } from "firebase/app"
import type { User } from "firebase/auth"

import { getFriendlyAuthError } from "./auth-error"
import { refreshServerSession } from "@/lib/firebase/app-check-fetch"
import type { getCopy } from "@/lib/i18n"

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

    const syncSession = async () => {
      setSessionPending(true)
      try {
        await refreshServerSession({
          forceRefresh: true,
          forceSession: true,
        })
        router.replace("/")
      } catch (error) {
        syncedUserIdRef.current = null
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
  }, [errors, loading, router, setError, user])

  return sessionPending
}
