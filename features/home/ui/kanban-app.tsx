"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import { clientAuth, clientDb } from "@/lib/firebase/client"
import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import {
  setStoredUiLocale,
  setUiLocaleTouched,
  useStoredUiLocale,
  useUiLocaleTouched,
} from "@/lib/browser-preferences"
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
  const uiLocale = useStoredUiLocale()
  const localeTouched = useUiLocaleTouched()
  const [error, setError] = React.useState<string | null>(null)
  const [profileState, setProfileState] = React.useState<{
    uid: string | null
    ready: boolean
    exists: boolean
  }>({ uid: null, ready: false, exists: false })
  const profileReady = profileState.uid === user?.uid && profileState.ready
  const profileExists = profileState.uid === user?.uid && profileState.exists
  const { notifyError } = useNotifications()
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])
  const handleUiLocaleChange = React.useCallback((value: Locale) => {
    setStoredUiLocale(value)
    setUiLocaleTouched(true)
  }, [])
  const localeTouchedRef = React.useRef(false)
  const uiLocaleRef = React.useRef<Locale>("en")

  React.useEffect(() => {
    localeTouchedRef.current = localeTouched
  }, [localeTouched])

  React.useEffect(() => {
    uiLocaleRef.current = uiLocale
  }, [uiLocale])

  React.useEffect(() => {
    if (error) {
      notifyError(error)
    }
  }, [error, notifyError])

  React.useEffect(() => {
    if (!user) {
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        setProfileState({
          uid: user.uid,
          ready: true,
          exists: snapshot.exists(),
        })
        if (snapshot.exists()) {
          const data = snapshot.data() as { preferredLocale?: Locale }
          if (data.preferredLocale === "ru" || data.preferredLocale === "en") {
            if (localeTouchedRef.current) {
              if (data.preferredLocale === uiLocaleRef.current) {
                setUiLocaleTouched(false)
              }
            } else {
              setStoredUiLocale(data.preferredLocale)
            }
          }
        }
      },
      () => {
        setError(uiCopy.board.errors.profileLoadFailed)
        setProfileState({ uid: user.uid, ready: true, exists: false })
      }
    )

    return () => unsubscribe()
  }, [uiCopy.board.errors.profileLoadFailed, user])

  React.useEffect(() => {
    if (!user || !profileReady) {
      return
    }

    if (!localeTouched && profileExists) {
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    const payload: {
      preferredLocale: Locale
      email: string | null
      createdAt?: ReturnType<typeof serverTimestamp>
      updatedAt: ReturnType<typeof serverTimestamp>
    } = {
      preferredLocale: uiLocale,
      email: user.email ?? null,
      updatedAt: serverTimestamp(),
    }

    if (!profileExists) {
      payload.createdAt = serverTimestamp()
    }

    setDoc(profileRef, payload, { merge: true })
      .then(() => {
        if (localeTouched) {
          setUiLocaleTouched(false)
        }
      })
      .catch(() => {
        setError(uiCopy.board.errors.profileUpdateFailed)
      })
  }, [
    localeTouched,
    profileExists,
    profileReady,
    uiCopy.board.errors.profileUpdateFailed,
    uiLocale,
    user,
  ])

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
