"use client"

import * as React from "react"
import type { User } from "firebase/auth"

import { getFriendlyAuthError } from "./auth-error"
import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
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
        const idToken = await user.getIdToken(true)
        const response = await fetchWithAppCheck("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        })

        if (!response.ok) {
          throw new Error(errors.sessionError)
        }

        router.replace("/")
      } catch (error) {
        syncedUserIdRef.current = null
        setError(getFriendlyAuthError(error, errors))
      } finally {
        setSessionPending(false)
      }
    }

    void syncSession()
  }, [errors, loading, router, setError, user])

  return sessionPending
}
