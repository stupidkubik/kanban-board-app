"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { getCopy } from "@/lib/i18n"
import styles from "./sign-in.module.css"

type AuthFormProps = {
  uiCopy: ReturnType<typeof getCopy>
  languageControls: React.ReactNode
  error: string | null
  notice: string | null
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  mode: "sign-in" | "sign-up"
  toggleMode: () => void
  emailPending: boolean
  onEmailAuth: (event: React.FormEvent<HTMLFormElement>) => void
  resetMode: boolean
  resetEmail: string
  setResetEmail: (value: string) => void
  resetPending: boolean
  openReset: () => void
  closeReset: () => void
  onPasswordReset: (event: React.FormEvent<HTMLFormElement>) => void
  googlePending: boolean
  sessionPending: boolean
  onGoogleSignIn: () => void
}

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
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
)

export const AuthForm = ({
  uiCopy,
  languageControls,
  error,
  notice,
  email,
  setEmail,
  password,
  setPassword,
  mode,
  toggleMode,
  emailPending,
  onEmailAuth,
  resetMode,
  resetEmail,
  setResetEmail,
  resetPending,
  openReset,
  closeReset,
  onPasswordReset,
  googlePending,
  sessionPending,
  onGoogleSignIn,
}: AuthFormProps) => (
  <div className={styles.page}>
    <div className={styles.card}>
      {languageControls}
      <div className={styles.header}>
        <h1 className={styles.title}>
          {resetMode ? uiCopy.auth.resetTitle : uiCopy.auth.title}
        </h1>
        <p className={styles.subtitle}>
          {resetMode ? uiCopy.auth.resetSubtitle : uiCopy.auth.subtitle}
        </p>
      </div>
      <div className={styles.content}>
        {resetMode ? (
          <>
            <form className={styles.form} onSubmit={onPasswordReset}>
              <Label className="srOnly" htmlFor="reset-email">
                {uiCopy.auth.emailPlaceholder}
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder={uiCopy.auth.emailPlaceholder}
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
              />
              <Button type="submit" disabled={resetPending}>
                {resetPending
                  ? uiCopy.auth.resetSending
                  : uiCopy.auth.resetSend}
              </Button>
            </form>
            <Button
              variant="ghost"
              type="button"
              disabled={resetPending}
              onClick={closeReset}
            >
              {uiCopy.auth.resetBack}
            </Button>
          </>
        ) : (
          <>
            <form className={styles.form} onSubmit={onEmailAuth}>
              <Label className="srOnly" htmlFor="auth-email">
                {uiCopy.auth.emailPlaceholder}
              </Label>
              <Input
                id="auth-email"
                type="email"
                placeholder={uiCopy.auth.emailPlaceholder}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Label className="srOnly" htmlFor="auth-password">
                {uiCopy.auth.passwordPlaceholder}
              </Label>
              <Input
                id="auth-password"
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
                  variant="ghost"
                  type="button"
                  disabled={emailPending}
                  onClick={openReset}
                >
                  {uiCopy.auth.forgotPassword}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                type="button"
                disabled={emailPending}
                onClick={toggleMode}
              >
                {mode === "sign-in"
                  ? uiCopy.auth.toggleToSignUp
                  : uiCopy.auth.toggleToSignIn}
              </Button>
            </form>
            <div className={styles.divider}>{uiCopy.auth.orLabel}</div>
            <Button
              variant="outline"
              className={styles.buttonGoogle}
              onClick={onGoogleSignIn}
              disabled={googlePending || emailPending || sessionPending}
              type="button"
            >
              {googlePending ? (
                uiCopy.auth.connecting
              ) : (
                <>
                  <GoogleIcon />
                  <span>{uiCopy.auth.googleButton}</span>
                </>
              )}
            </Button>
          </>
        )}
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </div>
  </div>
)
