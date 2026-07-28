"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { getBoardCoverGradient } from "@/lib/board-cover"
import type { BoardCopy } from "@/lib/types/board-ui"
import styles from "@/features/board/ui/board-header.module.css"

type BoardHeaderProps = {
  boardId: string
  boardTitle: string
  isViewer: boolean
  uiCopy: BoardCopy
}

export function BoardHeader({
  boardId,
  boardTitle,
  isViewer,
  uiCopy,
}: BoardHeaderProps) {
  const headerStyle = React.useMemo(
    () =>
      ({ "--header-gradient": getBoardCoverGradient(boardId) }) as React.CSSProperties,
    [boardId]
  )

  return (
    <header className={styles.header} style={headerStyle}>
      <Button asChild variant="ghost" size="icon-sm" className={styles.backLink}>
        <Link href="/" aria-label={uiCopy.board.backToBoards}>
          <ArrowLeft weight="bold" aria-hidden="true" />
        </Link>
      </Button>
      <div className={styles.titleBlock}>
        <h1 className={styles.title} title={boardTitle}>
          {boardTitle}
        </h1>
        {isViewer ? (
          <span className={styles.readOnlyNotice}>{uiCopy.board.readOnlyNotice}</span>
        ) : null}
      </div>
    </header>
  )
}
