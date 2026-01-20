"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import styles from "@/features/notifications/ui/toast.module.css"

type ToastVariant = "info" | "success" | "error"

type ToastItem = {
  id: string
  title?: string
  message: string
  variant?: ToastVariant
  actionLabel?: string
  onAction?: () => void | Promise<void>
}

type ToastStackProps = {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (!toasts.length) {
    return null
  }

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const variantClass =
          toast.variant === "error"
            ? styles.toastError
            : toast.variant === "success"
              ? styles.toastSuccess
              : undefined
        const role = toast.variant === "error" ? "alert" : "status"

        return (
          <div
            key={toast.id}
            className={`${styles.toast} ${variantClass ?? ""}`}
            role={role}
          >
            <div className={styles.toastContent}>
              {toast.title ? (
                <p className={styles.toastTitle}>{toast.title}</p>
              ) : null}
              <p className={styles.toastMessage}>{toast.message}</p>
              {toast.actionLabel ? (
                <div className={styles.toastActions}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await toast.onAction?.()
                      onDismiss(toast.id)
                    }}
                  >
                    {toast.actionLabel}
                  </Button>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={styles.toastDismiss}
              aria-label={toast.title ?? toast.message}
              onClick={() => onDismiss(toast.id)}
            >
              x
            </Button>
          </div>
        )}
      )}
    </div>
  )
}

export type { ToastItem, ToastVariant }
