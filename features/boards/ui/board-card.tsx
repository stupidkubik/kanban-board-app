"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type User } from "firebase/auth"
import { PencilSimpleLine, TrashSimple } from "@phosphor-icons/react"
import { getCopy, languageLabels, roleLabels, type Locale } from "@/lib/i18n"
import { canEditBoard as canEditBoardAccess, canInviteMembers, getMemberRole } from "@/lib/permissions"
import { type Board } from "@/lib/types/boards"
import { getBoardCoverGradient } from "@/lib/board-cover"
import {
  useDeleteBoardMutation,
  useGetBoardMembersQuery,
  useGetCardsQuery,
  useGetColumnsQuery,
  useUpdateBoardTitleMutation,
} from "@/lib/store/firestore-api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import styles from "@/features/home/ui/kanban-app.module.css"

type KanbanBoardCardProps = {
  board: Board
  onError: (message: string | null) => void
  uiLocale: Locale
  user: User
}

export function KanbanBoardCard({ board, onError, uiLocale, user }: KanbanBoardCardProps) {
  const router = useRouter()
  const [updateBoardTitleMutation] = useUpdateBoardTitleMutation()
  const [deleteBoardMutation] = useDeleteBoardMutation()
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameTitle, setRenameTitle] = React.useState("")
  const [renamePending, setRenamePending] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState(false)
  const deleteTimeoutRef = React.useRef<number | null>(null)
  const { notify, notifySuccess } = useNotifications()
  const { data: members = [] } = useGetBoardMembersQuery(board.id)
  const { data: columns = [] } = useGetColumnsQuery(board.id)
  const { data: cards = [] } = useGetCardsQuery({ boardId: board.id })

  const role = getMemberRole(board, user.uid)
  const isOwner = canInviteMembers(board, user.uid)
  const boardLanguage = board.language ?? uiLocale
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])
  const canEditBoard = canEditBoardAccess(board, user.uid)
  const clearDeleteTimeout = React.useCallback(() => {
    if (deleteTimeoutRef.current !== null) {
      window.clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = null
    }
  }, [])
  const roleLabel = role ? roleLabels[uiLocale][role] : roleLabels[uiLocale].member
  const boardLanguageLabel = languageLabels[boardLanguage]
  const visibleMembers = members.slice(0, 4)
  const remainingMembers = Math.max(0, members.length - visibleMembers.length)
  const coverStyle = React.useMemo(
    () => ({ backgroundImage: getBoardCoverGradient(board.id) }),
    [board.id]
  )
  const handleOpenBoard = React.useCallback(() => {
    router.push(`/boards/${board.id}`)
  }, [board.id, router])
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleOpenBoard()
    }
  }

  React.useEffect(() => {
    return () => {
      clearDeleteTimeout()
    }
  }, [clearDeleteTimeout])

  const handleRenameBoard = async () => {
    if (role === "viewer") {
      onError(uiCopy.board.errors.viewersCantUpdate)
      return
    }

    const trimmed = renameTitle.trim()
    if (!trimmed) {
      onError(uiCopy.board.errors.boardTitleRequired)
      return
    }

    if (trimmed === board.title) {
      setRenameOpen(false)
      setRenameTitle("")
      return
    }

    onError(null)
    setRenamePending(true)

    try {
      await updateBoardTitleMutation({ boardId: board.id, title: trimmed }).unwrap()
      setRenameOpen(false)
      setRenameTitle("")
    } catch (err) {
      onError(err instanceof Error ? err.message : uiCopy.board.errors.updateBoardFailed)
    } finally {
      setRenamePending(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!isOwner) {
      onError(uiCopy.board.errors.onlyOwnerCanDelete)
      return
    }

    onError(null)
    setDeletePending(true)
    setDeleteOpen(false)
    clearDeleteTimeout()

    deleteTimeoutRef.current = window.setTimeout(async () => {
      try {
        await deleteBoardMutation({ boardId: board.id }).unwrap()
      } catch (err) {
        onError(err instanceof Error ? err.message : uiCopy.board.errors.deleteBoardFailed)
      } finally {
        setDeletePending(false)
        deleteTimeoutRef.current = null
      }
    }, 4000)

    notify({
      message: uiCopy.board.boardDeleteQueuedToast,
      actionLabel: uiCopy.common.undo,
      onAction: async () => {
        clearDeleteTimeout()
        setDeletePending(false)
        notifySuccess(uiCopy.board.boardDeleteUndoToast)
      },
    })
  }

  return (
    <Card
      className={`${styles.boardItem} ${styles.boardClickable}`}
      size="sm"
      role="link"
      tabIndex={0}
      aria-label={`${uiCopy.board.openBoard}: ${board.title}`}
      onClick={handleOpenBoard}
      onKeyDown={handleCardKeyDown}
      data-testid="board-card"
      data-board-id={board.id}
      data-board-title={board.title}
    >
      <div className={styles.boardCover} style={coverStyle}>
        <div className={styles.boardCoverTop}>
          <Badge variant="outline" className={styles.boardRoleBadge}>
            {roleLabel}
          </Badge>
          {canEditBoard ? (
            <div onClick={(event) => event.stopPropagation()}>
              <AlertDialog
                open={renameOpen}
                onOpenChange={(open) => {
                  if (open) {
                    setRenameOpen(true)
                    setRenameTitle(board.title)
                  } else if (renameOpen) {
                    setRenameOpen(false)
                    setRenameTitle("")
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={styles.boardIconButton}
                    disabled={renamePending}
                    aria-label={uiCopy.board.renameBoard}
                  >
                    <PencilSimpleLine weight="bold" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {uiCopy.board.renameBoardTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {uiCopy.board.renameBoardDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <form
                    className={styles.modalForm}
                    onSubmit={(event) => {
                      event.preventDefault()
                      handleRenameBoard()
                    }}
                  >
                    <div className={styles.modalFields}>
                      <Field>
                        <FieldLabel className="srOnly" htmlFor={`rename-board-${board.id}`}>
                          {uiCopy.board.boardNamePlaceholder}
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id={`rename-board-${board.id}`}
                            className={styles.modalInput}
                            value={renameTitle}
                            onChange={(event) => setRenameTitle(event.target.value)}
                            placeholder={uiCopy.board.boardNamePlaceholder}
                            aria-label={uiCopy.board.boardNamePlaceholder}
                          />
                        </FieldContent>
                      </Field>
                    </div>
                    <AlertDialogFooter className={styles.modalFooter}>
                      <AlertDialogCancel type="button">
                        {uiCopy.common.cancel}
                      </AlertDialogCancel>
                      <Button type="submit" disabled={renamePending}>
                        {renamePending ? (
                          <Spinner
                            size="sm"
                            className={styles.buttonSpinner}
                            aria-hidden="true"
                          />
                        ) : null}
                        {renamePending
                          ? uiCopy.board.renamingBoard
                          : uiCopy.board.renameBoard}
                      </Button>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </div>
        <h3 className={styles.boardCoverTitle}>{board.title}</h3>
      </div>
      <CardContent className={styles.boardBody}>
        <div className={styles.boardMembers}>
          {visibleMembers.map((member) => {
            const label = member.displayName ?? member.email ?? ""
            return (
              <div
                key={member.id}
                className={styles.boardAvatar}
                title={label}
              >
                {member.photoURL ? (
                  <Image
                    src={member.photoURL}
                    alt={label}
                    width={28}
                    height={28}
                    className={styles.boardAvatarImage}
                    unoptimized
                  />
                ) : (
                  <span>{label.slice(0, 1).toUpperCase() || "?"}</span>
                )}
              </div>
            )
          })}
          {remainingMembers > 0 ? (
            <div className={`${styles.boardAvatar} ${styles.boardAvatarOverflow}`}>
              +{remainingMembers}
            </div>
          ) : null}
        </div>
        <div className={styles.boardStats}>
          <div className={styles.boardStat}>
            <span className={styles.boardStatValue}>{columns.length}</span>
            <span className={styles.boardStatLabel}>{uiCopy.board.columnsTitle}</span>
          </div>
          <div className={styles.boardStat}>
            <span className={styles.boardStatValue}>{cards.length}</span>
            <span className={styles.boardStatLabel}>{uiCopy.board.cardsLabel}</span>
          </div>
          <div className={styles.boardStat}>
            <span className={styles.boardStatValue}>{boardLanguageLabel}</span>
            <span className={styles.boardStatLabel}>{uiCopy.board.boardLanguageLabel}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className={styles.boardFooter} onClick={(event) => event.stopPropagation()}>
          <div className={styles.boardActions}>
            {isOwner ? (
              <AlertDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  if (open) {
                    setDeleteOpen(true)
                  } else if (deleteOpen) {
                    setDeleteOpen(false)
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={styles.boardDeleteButton}
                    disabled={deletePending}
                    aria-label={uiCopy.board.deleteBoard}
                  >
                    {deletePending ? (
                      <Spinner size="xs" className={styles.iconSpinner} aria-hidden="true" />
                    ) : (
                      <TrashSimple weight="bold" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {uiCopy.board.deleteBoardTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {uiCopy.board.deleteBoardDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className={styles.modalFooter}>
                    <AlertDialogCancel type="button">
                      {uiCopy.common.cancel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteBoard}
                      disabled={deletePending}
                    >
                      {deletePending ? (
                        <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
                      ) : null}
                      {deletePending
                        ? uiCopy.board.deletingBoard
                        : uiCopy.board.deleteBoard}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
