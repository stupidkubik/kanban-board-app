"use client"

import * as React from "react"

import { ToastStack, type ToastItem, type ToastVariant } from "@/features/notifications/ui/toast-stack"

type ToastInput = Omit<ToastItem, "id"> & {
  id?: string
  durationMs?: number
}

type NotificationsContextValue = {
  notify: (input: ToastInput) => string
  notifyError: (message: string) => string
  notifySuccess: (message: string) => string
}

const NotificationsContext = React.createContext<NotificationsContextValue | null>(null)

const DEFAULT_DURATION = 5000
const MAX_TOASTS = 3

const createToastId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const timeoutsRef = React.useRef(new Map<string, number>())

  const removeToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timeoutId = timeoutsRef.current.get(id)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const notify = React.useCallback(
    ({ id, durationMs = DEFAULT_DURATION, ...input }: ToastInput) => {
      const toastId = id ?? createToastId()
      setToasts((current) => {
        const next = [...current, { id: toastId, ...input }]
        return next.slice(-MAX_TOASTS)
      })

      if (durationMs > 0) {
        const timeoutId = window.setTimeout(() => {
          removeToast(toastId)
        }, durationMs)
        timeoutsRef.current.set(toastId, timeoutId)
      }

      return toastId
    },
    [removeToast]
  )

  const notifyVariant = React.useCallback(
    (variant: ToastVariant, message: string) =>
      notify({ message, variant }),
    [notify]
  )

  const value = React.useMemo(
    () => ({
      notify,
      notifyError: (message: string) => notifyVariant("error", message),
      notifySuccess: (message: string) => notifyVariant("success", message),
    }),
    [notify, notifyVariant]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = React.useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider")
  }
  return context
}
