"use client"

import { shallowEqual } from "react-redux"

import { Button } from "@/components/ui/button"
import { useAppSelector } from "@/lib/store/hooks"
import { retryListener } from "@/lib/store/listener-lifecycle"
import styles from "@/components/listener-error-notice.module.css"

type ListenerErrorNoticeProps = {
  // Listener keys from `listenerKeys`; null entries are ignored.
  keys: ReadonlyArray<string | null>
  message: string
  retryLabel: string
}

export function ListenerErrorNotice({
  keys,
  message,
  retryLabel,
}: ListenerErrorNoticeProps) {
  const failedKeys = useAppSelector(
    (state) =>
      keys.filter(
        (key): key is string => key !== null && key in state.listenerStatus
      ),
    shallowEqual
  )

  if (failedKeys.length === 0) {
    return null
  }

  return (
    <div className={styles.notice} role="alert" data-testid="listener-error">
      <span>{message}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => failedKeys.forEach(retryListener)}
      >
        {retryLabel}
      </Button>
    </div>
  )
}
