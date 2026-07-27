"use client"

import * as React from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"

import { getFriendlyAuthError } from "./auth-error"
import { clientAuth } from "@/lib/firebase/client"
import type { getCopy } from "@/lib/i18n"
import { isValidEmail } from "@/lib/validation"

const MIN_PASSWORD_LENGTH = 6

type AuthMode = "sign-in" | "sign-up"

type UseEmailAuthControllerArgs = {
  errors: ReturnType<typeof getCopy>["auth"]["errors"]
  setError: (message: string | null) => void
  setNotice: (message: string | null) => void
}

export const useEmailAuthController = ({
  errors,
  setError,
  setNotice,
}: UseEmailAuthControllerArgs) => {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [mode, setMode] = React.useState<AuthMode>("sign-in")
  const [emailPending, setEmailPending] = React.useState(false)

  const toggleMode = React.useCallback(() => {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))
  }, [])

  const handleEmailAuth = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)
      setNotice(null)

      const normalizedEmail = email.trim()
      if (!isValidEmail(normalizedEmail)) {
        setError(errors.invalidEmail)
        return
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(errors.weakPassword)
        return
      }

      setEmailPending(true)
      try {
        if (mode === "sign-in") {
          await signInWithEmailAndPassword(
            clientAuth,
            normalizedEmail,
            password
          )
        } else {
          await createUserWithEmailAndPassword(
            clientAuth,
            normalizedEmail,
            password
          )
        }
      } catch (error) {
        setError(getFriendlyAuthError(error, errors))
      } finally {
        setEmailPending(false)
      }
    },
    [email, errors, mode, password, setError, setNotice]
  )

  return {
    email,
    setEmail,
    password,
    setPassword,
    mode,
    toggleMode,
    emailPending,
    handleEmailAuth,
  }
}
