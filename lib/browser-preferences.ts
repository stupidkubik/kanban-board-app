"use client"

import * as React from "react"

import type { Locale } from "@/lib/i18n"

export type BoardsSortKey = "createdAt" | "title"
export type BoardsSortDirection = "asc" | "desc"
export type UiTheme = "light" | "dark"

const PREFERENCE_EVENT = "kanban:preference-change"

const keys = {
  locale: "uiLocale",
  localeTouched: "uiLocaleTouched",
  theme: "uiTheme",
  boardsSortKey: "boardsSortKey",
  boardsSortDirection: "boardsSortDirection",
} as const

const isLocale = (value: string): value is Locale => value === "ru" || value === "en"
const isTheme = (value: string): value is UiTheme =>
  value === "light" || value === "dark"
const isBoardsSortKey = (value: string): value is BoardsSortKey =>
  value === "createdAt" || value === "title"
const isBoardsSortDirection = (value: string): value is BoardsSortDirection =>
  value === "asc" || value === "desc"

const subscribeToPreference = (key: string, onStoreChange: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) {
      onStoreChange()
    }
  }
  const handlePreferenceChange = (event: Event) => {
    const preferenceEvent = event as CustomEvent<{ key?: string }>
    if (preferenceEvent.detail?.key === key) {
      onStoreChange()
    }
  }

  window.addEventListener("storage", handleStorage)
  window.addEventListener(PREFERENCE_EVENT, handlePreferenceChange)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(PREFERENCE_EVENT, handlePreferenceChange)
  }
}

const setPreference = (key: string, value: string | null) => {
  if (value === null) {
    window.localStorage.removeItem(key)
  } else {
    window.localStorage.setItem(key, value)
  }
  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: { key } }))
}

const useStringPreference = <Value extends string>(
  key: string,
  fallback: Value,
  isValid: (value: string) => value is Value
) => {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => subscribeToPreference(key, onStoreChange),
    [key]
  )
  const getSnapshot = React.useCallback(() => {
    const stored = window.localStorage.getItem(key)
    return stored && isValid(stored) ? stored : fallback
  }, [fallback, isValid, key])
  const getServerSnapshot = React.useCallback(() => fallback, [fallback])

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export const useStoredUiLocale = () =>
  useStringPreference(keys.locale, "en", isLocale)

export const setStoredUiLocale = (locale: Locale) => {
  setPreference(keys.locale, locale)
}

export const useUiLocaleTouched = () =>
  useStringPreference(keys.localeTouched, "0", (value): value is "0" | "1" =>
    value === "0" || value === "1"
  ) === "1"

export const setUiLocaleTouched = (touched: boolean) => {
  setPreference(keys.localeTouched, touched ? "1" : null)
}

export const useStoredTheme = () =>
  useStringPreference(keys.theme, "light", isTheme)

export const setStoredTheme = (theme: UiTheme) => {
  setPreference(keys.theme, theme)
}

export const useStoredBoardsSortKey = () =>
  useStringPreference(keys.boardsSortKey, "createdAt", isBoardsSortKey)

export const setStoredBoardsSortKey = (sortKey: BoardsSortKey) => {
  setPreference(keys.boardsSortKey, sortKey)
}

export const useStoredBoardsSortDirection = () =>
  useStringPreference(keys.boardsSortDirection, "desc", isBoardsSortDirection)

export const setStoredBoardsSortDirection = (
  sortDirection: BoardsSortDirection
) => {
  setPreference(keys.boardsSortDirection, sortDirection)
}
