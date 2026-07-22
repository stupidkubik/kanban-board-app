"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"

import { useAuth } from "@/components/auth-provider"
import { clientAuth } from "@/lib/firebase/client"
import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import { usePreferredLocale } from "@/lib/use-preferred-locale"
import { getCopy, languageLabels, type Locale } from "@/lib/i18n"
import { useGetBoardsQuery, useGetInvitesQuery } from "@/lib/store/firestore-api"
import { KanbanBoardsSection } from "@/features/boards/ui/boards-section"
import { KanbanInvitesSection } from "@/features/invites/ui/invites-section"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import { Button } from "@/components/ui/button"
import { firestoreApi } from "@/lib/store/firestore-api"
import { useAppDispatch } from "@/lib/store/hooks"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import styles from "@/features/home/ui/kanban-app.module.css"

export function KanbanApp() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const { data: boards = [] } = useGetBoardsQuery(user?.uid ?? null, {
    skip: !user?.uid,
  })
  const { data: invites = [] } = useGetInvitesQuery(user?.email ?? null, {
    skip: !user?.email,
  })
  const [error, setError] = React.useState<string | null>(null)
  const { locale: uiLocale, setLocale: handleUiLocaleChange } =
    usePreferredLocale(user, setError)
  const { notifyError } = useNotifications()
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])
  React.useEffect(() => {
    if (error) {
      notifyError(error)
    }
  }, [error, notifyError])

  const handleSignOut = async () => {
    setError(null)
    try {
      dispatch(firestoreApi.util.resetApiState())
      await fetchWithAppCheck("/api/auth/session", { method: "DELETE" })
      await signOut(clientAuth)
      router.replace("/sign-in")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.signOutFailed)
    }
  }

  return (
    <div className={styles.page}>
      <section className={`${styles.card} ${styles.topBar}`}>
        <div className={styles.topBarBrand}>
          <h2 className={styles.topBarTitle}>{uiCopy.common.appTitle}</h2>
          <p className={styles.topBarSubtitle}>{uiCopy.common.appSubtitle}</p>
        </div>
        {user ? (
          <div className={styles.topBarControls}>
            <div className={styles.topBarUser}>
              <span className={styles.topBarUserLabel}>{uiCopy.common.signedIn}</span>
              <span className={styles.topBarUserValue}>{user.email ?? user.uid}</span>
            </div>
            <div className={styles.topBarActions}>
              <Label className="srOnly" htmlFor="home-locale">
                {uiCopy.common.interfaceLanguage}
              </Label>
              <Select
                value={uiLocale}
                onValueChange={(value) => handleUiLocaleChange(value as Locale)}
              >
                <SelectTrigger
                  id="home-locale"
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
              <Button variant="outline" size="sm" onClick={handleSignOut} type="button">
                {uiCopy.common.signOut}
              </Button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {user ? (
        <>
          <KanbanInvitesSection
            invites={invites}
            onError={setError}
            uiCopy={uiCopy}
            uiLocale={uiLocale}
            user={user}
          />
          <KanbanBoardsSection
            boards={boards}
            onError={setError}
            uiCopy={uiCopy}
            uiLocale={uiLocale}
            user={user}
          />
        </>
      ) : null}
    </div>
  )
}
