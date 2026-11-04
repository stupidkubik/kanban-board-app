import type { UnknownAction } from "@reduxjs/toolkit"

import { getErrorCode } from "@/lib/errors"
import {
  listenerFailed,
  listenerStarted,
} from "@/lib/store/listener-status-slice"

export const listenerKeys = {
  boards: (uid: string) => `boards:${uid}`,
  invites: (email: string) => `invites:${email.toLowerCase()}`,
  columns: (boardId: string) => `columns:${boardId}`,
  cards: (boardId: string) => `cards:${boardId}`,
  members: (boardId: string) => `members:${boardId}`,
  labels: (boardId: string) => `labels:${boardId}`,
}

const retryHandlers = new Map<string, Set<() => void>>()

// Re-subscribes the listener for `key` if its cache entry is still mounted.
export const retryListener = (key: string) => {
  retryHandlers.get(key)?.forEach((restart) => restart())
}

type Subscribe = (onError: (error: unknown) => void) => () => void

// Runs a Firestore listener for the lifetime of an RTK Query cache entry,
// records terminal errors and restarts on retryListener(key). A refetch would
// not help: it re-runs the stub queryFn, not onCacheEntryAdded.
export const runRetryableListener = async ({
  key,
  dispatch,
  subscribe,
  cacheEntryRemoved,
}: {
  key: string
  dispatch: (action: UnknownAction) => unknown
  subscribe: Subscribe
  cacheEntryRemoved: Promise<void>
}) => {
  let unsubscribe = () => {}
  const start = () => {
    unsubscribe()
    dispatch(listenerStarted(key))
    unsubscribe = subscribe((error) => {
      dispatch(listenerFailed({ key, code: getErrorCode(error) ?? "unknown" }))
    })
  }

  const handlers = retryHandlers.get(key) ?? new Set<() => void>()
  retryHandlers.set(key, handlers)
  handlers.add(start)
  start()

  await cacheEntryRemoved
  handlers.delete(start)
  if (handlers.size === 0) {
    retryHandlers.delete(key)
  }
  unsubscribe()
  dispatch(listenerStarted(key))
}
