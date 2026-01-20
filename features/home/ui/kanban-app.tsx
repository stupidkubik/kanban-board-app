"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import { clientAuth, clientDb } from "@/lib/firebase/client"
import { getCopy, languageLabels, type Locale } from "@/lib/i18n"
import { useGetBoardsQuery, useGetInvitesQuery } from "@/lib/store/firestore-api"
import { KanbanBoardsSection } from "@/features/boards/ui/boards-section"
import { KanbanInvitesSection } from "@/features/invites/ui/invites-section"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import { Button } from "@/components/ui/button"
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
  const { user } = useAuth()
  const { data: boards = [] } = useGetBoardsQuery(user?.uid ?? null, {
    skip: !user?.uid,
  })
  const { data: invites = [] } = useGetInvitesQuery(user?.email ?? null, {
    skip: !user?.email,
  })
  const [uiLocale, setUiLocale] = React.useState<Locale>("ru")
  const [localeTouched, setLocaleTouched] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [profileReady, setProfileReady] = React.useState(false)
  const [profileExists, setProfileExists] = React.useState(false)
  const { notifyError } = useNotifications()
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])
  const handleUiLocaleChange = React.useCallback((value: Locale) => {
    setUiLocale(value)
    setLocaleTouched(true)
  }, [])
  const localeTouchedRef = React.useRef(false)
  const uiLocaleRef = React.useRef<Locale>("ru")

  React.useEffect(() => {
    localeTouchedRef.current = localeTouched
  }, [localeTouched])

  React.useEffect(() => {
    uiLocaleRef.current = uiLocale
  }, [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    const storedTouched = window.localStorage.getItem("uiLocaleTouched")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
    if (storedTouched === "1") {
      setLocaleTouched(true)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem("uiLocale", uiLocale)
  }, [uiLocale])

  React.useEffect(() => {
    if (error) {
      notifyError(error)
    }
  }, [error, notifyError])

  React.useEffect(() => {
    if (localeTouched) {
      window.localStorage.setItem("uiLocaleTouched", "1")
    } else {
      window.localStorage.removeItem("uiLocaleTouched")
    }
  }, [localeTouched])

  React.useEffect(() => {
    if (!user) {
      setProfileReady(false)
      setProfileExists(false)
      setLocaleTouched(false)
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        setProfileExists(snapshot.exists())
        if (snapshot.exists()) {
          const data = snapshot.data() as { preferredLocale?: Locale }
          if (data.preferredLocale === "ru" || data.preferredLocale === "en") {
            if (localeTouchedRef.current) {
              if (data.preferredLocale === uiLocaleRef.current) {
                setLocaleTouched(false)
              }
            } else {
              setUiLocale(data.preferredLocale)
            }
          }
        }
        setProfileReady(true)
      },
      () => {
        setError(uiCopy.board.errors.profileLoadFailed)
        setProfileReady(true)
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
          setLocaleTouched(false)
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
      await fetch("/api/auth/session", { method: "DELETE" })
      await signOut(clientAuth)
      router.replace("/sign-in")
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.board.errors.signOutFailed)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{uiCopy.common.appTitle}</h2>
          <p className={styles.cardSubtitle}>{uiCopy.common.appSubtitle}</p>
        </div>
        <div className={styles.cardContent}>
          {user ? (
            <div className={styles.row}>
              <div className={styles.meta}>
                <div>{uiCopy.common.signedIn}</div>
                <div className={styles.muted}>{user.email ?? user.uid}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.label}>{uiCopy.common.interfaceLanguage}</div>
                <Select
                  value={uiLocale}
                  onValueChange={(value) => handleUiLocaleChange(value as Locale)}
                >
                  <SelectTrigger aria-label={uiCopy.common.interfaceLanguage}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                    <SelectItem value="en">{languageLabels.en}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleSignOut} type="button">
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
        </div>
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
