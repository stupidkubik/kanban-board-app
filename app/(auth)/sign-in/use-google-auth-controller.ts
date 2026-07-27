"use client"

import * as React from "react"
import { FirebaseError } from "firebase/app"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth"

import { getFriendlyAuthError } from "./auth-error"
import { clientAuth } from "@/lib/firebase/client"
import type { getCopy } from "@/lib/i18n"

const googleProvider = new GoogleAuthProvider()

const redirectFallbackErrors = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
])

type UseGoogleAuthControllerArgs = {
  errors: ReturnType<typeof getCopy>["auth"]["errors"]
  setError: (message: string | null) => void
  setNotice: (message: string | null) => void
}

export const useGoogleAuthController = ({
  errors,
  setError,
  setNotice,
}: UseGoogleAuthControllerArgs) => {
  const [googlePending, setGooglePending] = React.useState(false)

  const handleGoogleSignIn = React.useCallback(async () => {
    setError(null)
    setNotice(null)
    setGooglePending(true)

    try {
      await signInWithPopup(clientAuth, googleProvider)
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        redirectFallbackErrors.has(error.code)
      ) {
        await signInWithRedirect(clientAuth, googleProvider)
        return
      }
      setError(getFriendlyAuthError(error, errors))
    } finally {
      setGooglePending(false)
    }
  }, [errors, setError, setNotice])

  return { googlePending, handleGoogleSignIn }
}
