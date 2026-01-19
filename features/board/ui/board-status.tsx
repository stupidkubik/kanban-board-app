"use client"

import * as React from "react"

import styles from "@/features/board/ui/board-page.module.css"

type BoardStatusProps = {
  error: string | null
}

export function BoardStatus({ error }: BoardStatusProps) {
  if (!error) {
    return null
  }

  return <p className={styles.error}>{error}</p>
}
