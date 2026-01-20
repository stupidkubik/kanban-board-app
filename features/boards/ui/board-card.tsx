"use client"

import * as React from "react"
import Link from "next/link"
import { type User } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { getCopy, languageLabels, roleLabels, type Locale } from "@/lib/i18n"
import { canEditBoard as canEditBoardAccess, canInviteMembers, getMemberRole } from "@/lib/permissions"
import { isValidEmail } from "@/lib/validation"
import { type Board, type BoardLanguage, type BoardRole } from "@/lib/types/boards"
import {
  useDeleteBoardMutation,
  useUpdateBoardLanguageMutation,
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useNotifications } from "@/features/notifications/ui/notifications-provider"
import styles from "@/features/home/ui/kanban-app.module.css"

type KanbanBoardCardProps = {
  board: Board
  onError: (message: string | null) => void
  uiLocale: Locale
  user: User
}

export function KanbanBoardCard({ board, onError, uiLocale, user }: KanbanBoardCardProps) {
  const [updateBoardTitleMutation] = useUpdateBoardTitleMutation()
  const [updateBoardLanguageMutation] = useUpdateBoardLanguageMutation()
  const [deleteBoardMutation] = useDeleteBoardMutation()
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameTitle, setRenameTitle] = React.useState("")
  const [renamePending, setRenamePending] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<BoardRole>("editor")
  const [invitePending, setInvitePending] = React.useState(false)
  const [languagePending, setLanguagePending] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState(false)
  const deleteTimeoutRef = React.useRef<number | null>(null)
  const { notify, notifySuccess } = useNotifications()

  const role = getMemberRole(board, user.uid)
  const isOwner = canInviteMembers(board, user.uid)
  const currentLanguage = board.language ?? "ru"
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])
  const boardCopy = React.useMemo(() => getCopy(currentLanguage), [currentLanguage])
  const errorCopy = React.useMemo(
    () => getCopy(board.language ?? uiLocale),
    [board.language, uiLocale]
  )
  const canEditBoard = canEditBoardAccess(board, user.uid)
  const canEditLanguage = canEditBoard
  const clearDeleteTimeout = React.useCallback(() => {
    if (deleteTimeoutRef.current !== null) {
      window.clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = null
    }
  }, [])

  React.useEffect(() => {
    return () => {
      clearDeleteTimeout()
    }
  }, [clearDeleteTimeout])

  const handleLanguageChange = async (language: BoardLanguage) => {
    if (role === "viewer") {
      onError(errorCopy.board.errors.viewersCantUpdate)
      return
    }

    if (board.language === language) {
      return
    }

    onError(null)
    setLanguagePending(true)

    try {
      await updateBoardLanguageMutation({ boardId: board.id, language }).unwrap()
    } catch (err) {
      onError(
        err instanceof Error ? err.message : errorCopy.board.errors.updateLanguageFailed
      )
    } finally {
      setLanguagePending(false)
    }
  }

  const handleRenameBoard = async () => {
    if (role === "viewer") {
      onError(errorCopy.board.errors.viewersCantUpdate)
      return
    }

    const trimmed = renameTitle.trim()
    if (!trimmed) {
      onError(errorCopy.board.errors.boardTitleRequired)
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
      onError(err instanceof Error ? err.message : errorCopy.board.errors.updateBoardFailed)
    } finally {
      setRenamePending(false)
    }
  }

  const handleInvite = async () => {
    if (!isOwner) {
      onError(errorCopy.board.errors.onlyOwnerCanInvite)
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      onError(errorCopy.board.errors.inviteInvalidEmail)
      return
    }

    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      onError(errorCopy.board.errors.inviteSelf)
      return
    }

    onError(null)
    setInvitePending(true)

    try {
      await setDoc(doc(clientDb, "boardInvites", `${board.id}__${normalizedEmail}`), {
        boardId: board.id,
        boardTitle: board.title,
        email: normalizedEmail,
        role: inviteRole,
        invitedById: user.uid,
        createdAt: serverTimestamp(),
      })
      setInviteEmail("")
    } catch (err) {
      onError(err instanceof Error ? err.message : errorCopy.board.errors.inviteFailed)
    } finally {
      setInvitePending(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!isOwner) {
      onError(errorCopy.board.errors.onlyOwnerCanDelete)
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
        onError(err instanceof Error ? err.message : errorCopy.board.errors.deleteBoardFailed)
      } finally {
        setDeletePending(false)
        deleteTimeoutRef.current = null
      }
    }, 4000)

    notify({
      message: boardCopy.board.boardDeleteQueuedToast,
      actionLabel: uiCopy.common.undo,
      onAction: async () => {
        clearDeleteTimeout()
        setDeletePending(false)
        notifySuccess(boardCopy.board.boardDeleteUndoToast)
      },
    })
  }

  return (
    <Card
      className={styles.boardItem}
      data-testid="board-card"
      data-board-id={board.id}
      data-board-title={board.title}
    >
      <CardHeader>
        <CardTitle>{board.title}</CardTitle>
        <CardDescription>
          <div className={styles.boardMeta}>
            <span className={styles.muted}>
              {boardCopy.board.ownerLabel}: {board.ownerId}
            </span>
            <span className={styles.muted}>
              {boardCopy.board.roleLabel}:{" "}
              {role
                ? roleLabels[currentLanguage][role]
                : roleLabels[currentLanguage].member}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.boardContent}>
        <div className={styles.section}>
          <div className={styles.label}>
            {boardCopy.board.boardLanguageLabel}
            {languagePending ? (
              <Spinner size="xs" className={styles.inlineSpinner} aria-hidden="true" />
            ) : null}
          </div>
          <Select
            value={currentLanguage}
            onValueChange={(value) => handleLanguageChange(value as BoardLanguage)}
            disabled={!canEditLanguage || languagePending}
          >
            <SelectTrigger
              size="sm"
              aria-label={boardCopy.board.boardLanguageLabel}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">{languageLabels.ru}</SelectItem>
              <SelectItem value="en">{languageLabels.en}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isOwner ? (
          <div className={styles.section}>
            <div className={styles.label}>{boardCopy.board.inviteMember}</div>
            <div className={styles.inviteRow}>
              <Input
                className={styles.input}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={boardCopy.board.inviteEmailPlaceholder}
                aria-label={boardCopy.board.inviteEmailPlaceholder}
                data-testid="invite-email"
              />
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as BoardRole)}
              >
                <SelectTrigger size="sm" aria-label={boardCopy.board.roleLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    {roleLabels[currentLanguage].editor}
                  </SelectItem>
                  <SelectItem value="viewer">
                    {roleLabels[currentLanguage].viewer}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleInvite}
                disabled={invitePending}
                data-testid="invite-submit"
              >
                {invitePending ? (
                  <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
                ) : null}
                {invitePending
                  ? boardCopy.board.inviteSending
                  : boardCopy.board.inviteButton}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <div className={styles.boardFooter}>
          <Button asChild variant="outline">
            <Link href={`/boards/${board.id}`} data-testid="open-board">
              {boardCopy.board.openBoard}
            </Link>
          </Button>
          <div className={styles.boardActions}>
            {canEditBoard ? (
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
                  <Button type="button" variant="outline" disabled={renamePending}>
                    {renamePending ? (
                      <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
                    ) : null}
                    {boardCopy.board.renameBoard}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {boardCopy.board.renameBoardTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {boardCopy.board.renameBoardDescription}
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
                      <Input
                        className={styles.input}
                        value={renameTitle}
                        onChange={(event) => setRenameTitle(event.target.value)}
                        placeholder={boardCopy.board.boardNamePlaceholder}
                        aria-label={boardCopy.board.boardNamePlaceholder}
                      />
                    </div>
                    <AlertDialogFooter className={styles.modalFooter}>
                      <AlertDialogCancel type="button">
                        {uiCopy.common.cancel}
                      </AlertDialogCancel>
                      <Button type="submit" disabled={renamePending}>
                        {renamePending ? (
                          <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
                        ) : null}
                        {renamePending
                          ? boardCopy.board.renamingBoard
                          : boardCopy.board.renameBoard}
                      </Button>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
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
                  <Button type="button" variant="destructive" disabled={deletePending}>
                    {deletePending ? (
                      <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
                    ) : null}
                    {boardCopy.board.deleteBoard}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {boardCopy.board.deleteBoardTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {boardCopy.board.deleteBoardDescription}
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
                        ? boardCopy.board.deletingBoard
                        : boardCopy.board.deleteBoard}
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
