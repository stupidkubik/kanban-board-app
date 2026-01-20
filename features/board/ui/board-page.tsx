"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { useGetBoardQuery } from "@/lib/store/firestore-api"
import { getCopy, type Locale } from "@/lib/i18n"
import { canEditBoard, canInviteMembers, getMemberRole } from "@/lib/permissions"
import { BoardContent } from "@/features/board/ui/board-content"
import styles from "@/features/board/ui/board-page.module.css"

export function BoardPage() {
  const params = useParams<{ boardId?: string | string[] }>()
  const { user } = useAuth()
  const boardId = Array.isArray(params?.boardId)
    ? params.boardId[0]
    : params?.boardId
  const [uiLocale, setUiLocale] = React.useState<Locale>("en")

  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

  React.useEffect(() => {
    const storedLocale = window.localStorage.getItem("uiLocale")
    if (storedLocale === "ru" || storedLocale === "en") {
      setUiLocale(storedLocale)
    }
  }, [])

  const { data: board } = useGetBoardQuery(boardId ?? null, {
    skip: !boardId,
  })

  const role = board ? getMemberRole(board, user?.uid) : null
  const canEdit = board ? canEditBoard(board, user?.uid) : false
  const isViewer = role === "viewer"
  const isOwner = board ? canInviteMembers(board, user?.uid) : false
  if (!boardId) {
    return null
  }

  return (
    <div className={styles.page}>
      <BoardContent
        boardId={boardId}
        board={board ?? null}
        user={user}
        boardTitle={board?.title ?? "Board"}
        canEdit={canEdit}
        isOwner={isOwner}
        isViewer={isViewer}
        uiCopy={uiCopy}
        uiLocale={uiLocale}
      />
    </div>
  )
}
