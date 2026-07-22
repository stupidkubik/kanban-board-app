"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore"

import {
  setStoredUiLocale,
  setUiLocaleTouched,
  useStoredUiLocale,
  useUiLocaleTouched,
} from "@/lib/browser-preferences"
import { clientDb } from "@/lib/firebase/client"
import { getCopy, type Locale } from "@/lib/i18n"

type LocaleSyncError = "load" | "update"

export const usePreferredLocale = (
  user: User | null,
  onError?: (message: string, kind: LocaleSyncError) => void
) => {
  const locale = useStoredUiLocale()
  const localeTouched = useUiLocaleTouched()
  const [profileState, setProfileState] = React.useState<{
    uid: string | null
    ready: boolean
    exists: boolean
  }>({ uid: null, ready: false, exists: false })
  const localeRef = React.useRef(locale)
  const touchedRef = React.useRef(localeTouched)
  const onErrorRef = React.useRef(onError)

  React.useEffect(() => {
    localeRef.current = locale
    touchedRef.current = localeTouched
    onErrorRef.current = onError
  }, [locale, localeTouched, onError])

  React.useEffect(() => {
    if (!user) {
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    return onSnapshot(
      profileRef,
      (snapshot) => {
        setProfileState({
          uid: user.uid,
          ready: true,
          exists: snapshot.exists(),
        })
        const preferredLocale = snapshot.data()?.preferredLocale
        if (preferredLocale !== "ru" && preferredLocale !== "en") {
          return
        }
        if (touchedRef.current) {
          if (preferredLocale === localeRef.current) {
            setUiLocaleTouched(false)
          }
          return
        }
        setStoredUiLocale(preferredLocale)
      },
      () => {
        setProfileState({ uid: user.uid, ready: true, exists: false })
        onErrorRef.current?.(
          getCopy(localeRef.current).board.errors.profileLoadFailed,
          "load"
        )
      }
    )
  }, [user])

  const profileReady = profileState.uid === user?.uid && profileState.ready
  const profileExists = profileState.uid === user?.uid && profileState.exists

  React.useEffect(() => {
    if (!user || !profileReady || (!localeTouched && profileExists)) {
      return
    }

    const profileRef = doc(clientDb, "users", user.uid)
    const payload: {
      preferredLocale: Locale
      email: string | null
      createdAt?: ReturnType<typeof serverTimestamp>
      updatedAt: ReturnType<typeof serverTimestamp>
    } = {
      preferredLocale: locale,
      email: user.email ?? null,
      updatedAt: serverTimestamp(),
    }
    if (!profileExists) {
      payload.createdAt = serverTimestamp()
    }

    setDoc(profileRef, payload, { merge: true })
      .then(() => setUiLocaleTouched(false))
      .catch(() => {
        onErrorRef.current?.(
          getCopy(localeRef.current).board.errors.profileUpdateFailed,
          "update"
        )
      })
  }, [locale, localeTouched, profileExists, profileReady, user])

  const setLocale = React.useCallback((value: Locale) => {
    setStoredUiLocale(value)
    setUiLocaleTouched(true)
  }, [])

  return { locale, setLocale }
}
