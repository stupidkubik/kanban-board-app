"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { usePreferredLocale } from "@/lib/use-preferred-locale"
import { useGetBoardQuery } from "@/lib/store/firestore-api"
import { getCopy } from "@/lib/i18n"
import { canEditBoard, canInviteMembers, getMemberRole } from "@/lib/permissions"
import { BoardContent } from "@/features/board/ui/board-content"
import styles from "@/features/board/ui/board-page.module.css"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"

export function BoardPage() {
  const params = useParams<{ boardId?: string | string[] }>()
  const { user } = useAuth()
  const { notifyError } = useNotifications()
  const boardId = Array.isArray(params?.boardId)
    ? params.boardId[0]
    : params?.boardId
  const { locale: uiLocale, setLocale: handleUiLocaleChange } =
    usePreferredLocale(user, notifyError)

  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])

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
        onUiLocaleChange={handleUiLocaleChange}
      />
    </div>
  )
}
