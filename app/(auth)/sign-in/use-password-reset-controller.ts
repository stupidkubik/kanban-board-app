"use client"

import * as React from "react"
import { sendPasswordResetEmail } from "firebase/auth"

import { getFriendlyAuthError } from "./auth-error"
import { clientAuth } from "@/lib/firebase/client"
import type { getCopy } from "@/lib/i18n"
import { isValidEmail } from "@/lib/validation"

type UsePasswordResetControllerArgs = {
  resetNotice: string
  errors: ReturnType<typeof getCopy>["auth"]["errors"]
  setError: (message: string | null) => void
  setNotice: (message: string | null) => void
}

export const usePasswordResetController = ({
  resetNotice,
  errors,
  setError,
  setNotice,
}: UsePasswordResetControllerArgs) => {
  const [resetMode, setResetMode] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const [resetPending, setResetPending] = React.useState(false)

  const openReset = React.useCallback(
    (email: string) => {
      setResetEmail(email)
      setResetMode(true)
      setNotice(null)
      setError(null)
    },
    [setError, setNotice]
  )

  const closeReset = React.useCallback(() => {
    setResetMode(false)
    setNotice(null)
    setError(null)
  }, [setError, setNotice])

  const handlePasswordReset = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const normalizedEmail = resetEmail.trim()
      setError(null)
      setNotice(null)

      if (!isValidEmail(normalizedEmail)) {
        setError(errors.invalidEmail)
        return
      }

      setResetPending(true)
      try {
        await sendPasswordResetEmail(clientAuth, normalizedEmail)
        setNotice(resetNotice)
      } catch (error) {
        setError(getFriendlyAuthError(error, errors))
      } finally {
        setResetPending(false)
      }
    },
    [errors, resetEmail, resetNotice, setError, setNotice]
  )

  return {
    resetMode,
    resetEmail,
    setResetEmail,
    resetPending,
    openReset,
    closeReset,
    handlePasswordReset,
  }
}
