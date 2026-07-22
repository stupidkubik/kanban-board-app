"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { usePreferredLocale } from "@/lib/use-preferred-locale"
import { useGetBoardQuery } from "@/lib/store/firestore-api"
import { getCopy } from "@/lib/i18n"
import { canEditBoard, canInviteMembers, getMemberRole } from "@/lib/permissions"
import { BoardContent } from "@/features/board/ui/board-content"
import styles from "@/features/board/ui/board-page.module.css"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [subscriptionKey, setSubscriptionKey] = React.useState(0)

  const { data: boardState } = useGetBoardQuery(
    { boardId: boardId ?? null, subscriptionKey },
    { skip: !boardId }
  )
  const board = boardState?.board ?? null

  const role = board ? getMemberRole(board, user?.uid) : null
  const canEdit = board ? canEditBoard(board, user?.uid) : false
  const isViewer = role === "viewer"
  const isOwner = board ? canInviteMembers(board, user?.uid) : false
  if (!boardId) {
    return null
  }

  if (!boardState || boardState.status !== "ready" || !board) {
    const status = boardState?.status ?? "loading"
    const content =
      status === "not-found"
        ? {
            title: uiCopy.board.boardNotFoundTitle,
            description: uiCopy.board.boardNotFoundDescription,
          }
        : status === "forbidden"
          ? {
              title: uiCopy.board.boardForbiddenTitle,
              description: uiCopy.board.boardForbiddenDescription,
            }
          : status === "error"
            ? {
                title: uiCopy.board.boardLoadFailedTitle,
                description: uiCopy.board.boardLoadFailedDescription,
              }
            : { title: uiCopy.board.boardLoading, description: null }

    return (
      <div className={styles.page}>
        <Card className={styles.accessState} aria-live="polite">
          <CardHeader>
            <CardTitle>{content.title}</CardTitle>
          </CardHeader>
          <CardContent className={styles.accessStateContent}>
            {content.description ? <p>{content.description}</p> : null}
            <div className={styles.accessStateActions}>
              {status === "error" ? (
                <Button
                  type="button"
                  onClick={() => setSubscriptionKey((key) => key + 1)}
                >
                  {uiCopy.board.retry}
                </Button>
              ) : null}
              {status !== "loading" ? (
                <Button asChild variant="outline">
                  <Link href="/">{uiCopy.board.backToBoards}</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
