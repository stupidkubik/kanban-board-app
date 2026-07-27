"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AuthForm } from "./auth-form"
import { useEmailAuthController } from "./use-email-auth-controller"
import { useGoogleAuthController } from "./use-google-auth-controller"
import { usePasswordResetController } from "./use-password-reset-controller"
import { useSessionBootstrap } from "./use-session-bootstrap"
import { useAuth } from "@/components/auth-provider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { getCopy, languageLabels, type Locale } from "@/lib/i18n"
import { usePreferredLocale } from "@/lib/use-preferred-locale"
import styles from "./sign-in.module.css"

export default function SignInPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const { locale, setLocale } = usePreferredLocale(user, setError)
  const uiCopy = React.useMemo(() => getCopy(locale), [locale])

  const emailAuth = useEmailAuthController({
    errors: uiCopy.auth.errors,
    setError,
    setNotice,
  })
  const passwordReset = usePasswordResetController({
    resetNotice: uiCopy.auth.resetNotice,
    errors: uiCopy.auth.errors,
    setError,
    setNotice,
  })
  const googleAuth = useGoogleAuthController({
    errors: uiCopy.auth.errors,
    setError,
    setNotice,
  })
  const sessionPending = useSessionBootstrap({
    loading,
    user,
    router,
    errors: uiCopy.auth.errors,
    setError,
  })

  if (loading) {
    return <div className={styles.loading}>{uiCopy.auth.loading}</div>
  }
  if (user) {
    return null
  }

  const languageControls = (
    <div className={`${styles.row} ${styles.utilityBar}`}>
      <Label className={styles.rowLabel} htmlFor="sign-in-locale">
        {uiCopy.common.interfaceLanguage}
      </Label>
      <div className={styles.rowControls}>
        <Select
          value={locale}
          onValueChange={(value) => setLocale(value as Locale)}
        >
          <SelectTrigger
            id="sign-in-locale"
            aria-label={uiCopy.common.interfaceLanguage}
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ru">{languageLabels.ru}</SelectItem>
            <SelectItem value="en">{languageLabels.en}</SelectItem>
          </SelectContent>
        </Select>
        <ThemeToggle
          labels={{
            light: uiCopy.common.themeLight,
            dark: uiCopy.common.themeDark,
            switchToLight: uiCopy.common.themeSwitchToLight,
            switchToDark: uiCopy.common.themeSwitchToDark,
          }}
        />
      </div>
    </div>
  )

  return (
    <AuthForm
      uiCopy={uiCopy}
      languageControls={languageControls}
      error={error}
      notice={notice}
      {...emailAuth}
      {...passwordReset}
      {...googleAuth}
      openReset={() => passwordReset.openReset(emailAuth.email)}
      onEmailAuth={emailAuth.handleEmailAuth}
      onPasswordReset={passwordReset.handlePasswordReset}
      onGoogleSignIn={googleAuth.handleGoogleSignIn}
      sessionPending={sessionPending}
    />
  )
}
