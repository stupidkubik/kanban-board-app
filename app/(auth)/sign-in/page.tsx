"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FirebaseError } from "firebase/app"
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/components/auth-provider"
import { clientAuth } from "@/lib/firebase/client"
import { getCopy, languageLabels, type Locale } from "@/lib/i18n"

const providers = {
  google: new GoogleAuthProvider(),
} as const

type ProviderKey = keyof typeof providers

const MIN_PASSWORD_LENGTH = 6

const redirectFallbackErrors = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
])

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

const getFriendlyError = (
  err: unknown,
  errors: ReturnType<typeof getCopy>["auth"]["errors"]
) => {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-email":
        return errors.invalidEmail
      case "auth/missing-password":
        return errors.missingPassword
      case "auth/weak-password":
        return errors.weakPassword
      case "auth/user-not-found":
        return errors.userNotFound
      case "auth/wrong-password":
        return errors.wrongPassword
      case "auth/invalid-credential":
        return errors.invalidCredential
      case "auth/email-already-in-use":
        return errors.emailAlreadyInUse
      case "auth/account-exists-with-different-credential":
        return errors.accountExists
      case "auth/popup-closed-by-user":
        return errors.popupClosed
      case "auth/popup-blocked":
        return errors.popupBlocked
      case "auth/too-many-requests":
        return errors.tooManyRequests
      default:
        return err.message || errors.generic
    }
  }

  return err instanceof Error ? err.message : errors.generic
}

export default function SignInPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [pendingProvider, setPendingProvider] = React.useState<ProviderKey | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [uiLocale, setUiLocale] = React.useState<Locale>("ru")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in")
  const [emailPending, setEmailPending] = React.useState(false)
  const [resetPending, setResetPending] = React.useState(false)
  const [sessionPending, setSessionPending] = React.useState(false)
  const [resetMode, setResetMode] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem("uiLocale", uiLocale)
  }, [uiLocale])

  React.useEffect(() => {
    if (loading || !user || sessionPending) {
      return
    }

    const syncSession = async () => {
      setSessionPending(true)
      try {
        const idToken = await user.getIdToken(true)
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        })

        if (!response.ok) {
          throw new Error(uiCopy.auth.errors.sessionError)
        }

        router.replace("/")
      } catch (err) {
        setError(getFriendlyError(err, uiCopy.auth.errors))
      } finally {
        setSessionPending(false)
      }
    }

    void syncSession()
  }, [loading, router, sessionPending, user])

  const handleSignIn = async (providerKey: ProviderKey) => {
    const provider = providers[providerKey]
    setError(null)
    setNotice(null)
    setPendingProvider(providerKey)

    try {
      await signInWithPopup(clientAuth, provider)
    } catch (err) {
      if (err instanceof FirebaseError && redirectFallbackErrors.has(err.code)) {
        await signInWithRedirect(clientAuth, provider)
        return
      }
      setError(getFriendlyError(err, uiCopy.auth.errors))
    } finally {
      setPendingProvider(null)
    }
  }

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const normalizedEmail = email.trim()
    if (!isValidEmail(normalizedEmail)) {
      setError(uiCopy.auth.errors.invalidEmail)
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(uiCopy.auth.errors.weakPassword)
      return
    }

    setEmailPending(true)

    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(clientAuth, normalizedEmail, password)
      } else {
        await createUserWithEmailAndPassword(clientAuth, normalizedEmail, password)
      }
    } catch (err) {
      setError(getFriendlyError(err, uiCopy.auth.errors))
    } finally {
      setEmailPending(false)
    }
  }

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = resetEmail.trim()
    setError(null)
    setNotice(null)

    if (!isValidEmail(normalizedEmail)) {
      setError(uiCopy.auth.errors.invalidEmail)
      return
    }

    setResetPending(true)

    try {
      await sendPasswordResetEmail(clientAuth, normalizedEmail)
      setNotice(uiCopy.auth.resetNotice)
    } catch (err) {
      setError(getFriendlyError(err, uiCopy.auth.errors))
    } finally {
      setResetPending(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-md px-4 py-10 text-sm text-muted-foreground">
        {uiCopy.auth.loading}
      </div>
    )
  }

  if (user) {
    return null
  }

  if (resetMode) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{uiCopy.auth.resetTitle}</CardTitle>
            <CardDescription>{uiCopy.auth.resetSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {uiCopy.common.interfaceLanguage}
              </div>
              <Select
                value={uiLocale}
                onValueChange={(value) => setUiLocale(value as Locale)}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                  <SelectItem value="en">{languageLabels.en}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <form className="flex flex-col gap-3" onSubmit={handlePasswordReset}>
              <Input
                type="email"
                placeholder={uiCopy.auth.emailPlaceholder}
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
              />
              <Button type="submit" disabled={resetPending}>
                {resetPending ? uiCopy.auth.resetSending : uiCopy.auth.resetSend}
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              disabled={resetPending}
              onClick={() => {
                setResetMode(false)
                setNotice(null)
                setError(null)
              }}
            >
              {uiCopy.auth.resetBack}
            </Button>
            {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{uiCopy.auth.title}</CardTitle>
          <CardDescription>{uiCopy.auth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {uiCopy.common.interfaceLanguage}
            </div>
            <Select
              value={uiLocale}
              onValueChange={(value) => setUiLocale(value as Locale)}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                <SelectItem value="en">{languageLabels.en}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <form className="flex flex-col gap-3" onSubmit={handleEmailAuth}>
            <Input
              type="email"
              placeholder={uiCopy.auth.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder={uiCopy.auth.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" disabled={emailPending}>
              {emailPending
                ? uiCopy.auth.connecting
                : mode === "sign-in"
                  ? uiCopy.auth.signInEmail
                  : uiCopy.auth.signUpEmail}
            </Button>
            {mode === "sign-in" ? (
              <Button
                type="button"
                variant="ghost"
                disabled={emailPending}
                onClick={() => {
                  setResetEmail(email)
                  setResetMode(true)
                  setNotice(null)
                  setError(null)
                }}
              >
                {uiCopy.auth.forgotPassword}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              disabled={emailPending}
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            >
              {mode === "sign-in"
                ? uiCopy.auth.toggleToSignUp
                : uiCopy.auth.toggleToSignIn}
            </Button>
          </form>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {uiCopy.auth.orLabel}
          </div>
          <Button
            onClick={() => handleSignIn("google")}
            disabled={pendingProvider !== null || emailPending || sessionPending}
            className="gap-2 border border-input bg-white text-slate-900 hover:bg-slate-50"
          >
            {pendingProvider === "google" ? (
              uiCopy.auth.connecting
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                >
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1 0-3.3 2.7-6.1 6-6.1 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.3 12 2.3 6.9 2.3 2.7 6.5 2.7 11.6s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.6H12z"
                  />
                  <path
                    fill="#34A853"
                    d="M3.8 7.3l3.2 2.3c.9-1.7 2.7-2.9 5-2.9 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.3 12 2.3c-3.7 0-6.9 2.2-8.2 5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12 20.9c2.7 0 4.9-.9 6.5-2.4l-3-2.3c-.8.5-1.9.9-3.5.9-3.3 0-6-2.2-6.9-5.2l-3.3 2.5c1.4 3.8 5.1 6.5 10.2 6.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M20.7 11.8c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1.1 2.2-2.4 2.9l3 2.3c1.8-1.6 2.9-4.1 2.9-7.5z"
                  />
                </svg>
                <span>{uiCopy.auth.googleButton}</span>
              </>
            )}
          </Button>
          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
