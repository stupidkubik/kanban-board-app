import "client-only"

import { getToken } from "firebase/app-check"

import { clientAppCheck, clientAuth } from "@/lib/firebase/client"

const APP_CHECK_HEADER = "X-Firebase-AppCheck"
const SESSION_PATH = "/api/auth/session"
const SESSION_SYNC_STORAGE_KEY = "kanban:server-session-sync"
const SESSION_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 6

let sessionRefreshPromise: Promise<void> | null = null

const readSessionSync = () => {
  try {
    const value = window.localStorage.getItem(SESSION_SYNC_STORAGE_KEY)
    if (!value) return null
    return JSON.parse(value) as { uid?: unknown; syncedAt?: unknown }
  } catch {
    return null
  }
}

const writeSessionSync = (uid: string) => {
  try {
    window.localStorage.setItem(
      SESSION_SYNC_STORAGE_KEY,
      JSON.stringify({ uid, syncedAt: Date.now() })
    )
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

const clearSessionSync = () => {
  try {
    window.localStorage.removeItem(SESSION_SYNC_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

const fetchOnceWithAppCheck = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const headers = new Headers(init.headers)

  if (clientAppCheck) {
    const { token } = await getToken(clientAppCheck, false)
    headers.set(APP_CHECK_HEADER, token)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

const isSessionRequest = (input: RequestInfo | URL) => {
  if (typeof input === "string") {
    return input === SESSION_PATH || input.startsWith(`${SESSION_PATH}?`)
  }
  if (input instanceof URL) {
    return input.pathname === SESSION_PATH
  }
  return new URL(input.url, window.location.origin).pathname === SESSION_PATH
}

export const refreshServerSession = async ({
  forceRefresh = false,
  forceSession = false,
}: { forceRefresh?: boolean; forceSession?: boolean } = {}) => {
  const user = clientAuth.currentUser
  if (!user) {
    throw new Error("Cannot refresh server session without a signed-in user")
  }

  const lastSync = readSessionSync()
  if (
    !forceSession &&
    lastSync?.uid === user.uid &&
    typeof lastSync.syncedAt === "number" &&
    Date.now() - lastSync.syncedAt < SESSION_SYNC_INTERVAL_MS
  ) {
    return
  }

  if (sessionRefreshPromise) {
    return sessionRefreshPromise
  }

  sessionRefreshPromise = (async () => {
    const idToken = await user.getIdToken(forceRefresh)
    const response = await fetchOnceWithAppCheck(SESSION_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh server session (${response.status})`)
    }
    writeSessionSync(user.uid)
  })()

  try {
    await sessionRefreshPromise
  } finally {
    sessionRefreshPromise = null
  }
}

export const fetchWithAppCheck = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const response = await fetchOnceWithAppCheck(input, init)
  if (
    response.ok &&
    isSessionRequest(input) &&
    init.method?.toUpperCase() === "DELETE"
  ) {
    clearSessionSync()
  }
  if (
    response.status !== 401 ||
    isSessionRequest(input) ||
    !clientAuth.currentUser
  ) {
    return response
  }

  await refreshServerSession({ forceRefresh: true, forceSession: true })
  return fetchOnceWithAppCheck(input, init)
}
