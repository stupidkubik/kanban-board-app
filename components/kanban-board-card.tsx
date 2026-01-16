"use client"

import * as React from "react"
import Link from "next/link"
import { type User } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { clientDb } from "@/lib/firebase/client"
import { getCopy, languageLabels, roleLabels, type Locale } from "@/lib/i18n"
import { type Board, type BoardLanguage, type BoardRole } from "@/lib/types/boards"
import {
  useDeleteBoardMutation,
  useUpdateBoardLanguageMutation,
  useUpdateBoardTitleMutation,
} from "@/lib/store/firestore-api"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import styles from "@/components/kanban-app.module.css"

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

const getMemberRole = (board: Board, uid: string) => {
  if (!board.members[uid]) {
    return null
  }

  const explicitRole = board.roles?.[uid]
  if (explicitRole) {
    return explicitRole
  }

  if (board.ownerId === uid) {
    return "owner"
  }

  return "editor"
}

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

  const role = getMemberRole(board, user.uid)
  const isOwner = board.ownerId === user.uid
  const currentLanguage = board.language ?? "ru"
  const uiCopy = React.useMemo(() => getCopy(uiLocale), [uiLocale])
  const boardCopy = React.useMemo(() => getCopy(currentLanguage), [currentLanguage])
  const errorCopy = React.useMemo(
    () => getCopy(board.language ?? uiLocale),
    [board.language, uiLocale]
  )
  const canEditLanguage = role !== "viewer"
  const canEditBoard = role !== "viewer"

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

    try {
      await deleteBoardMutation({ boardId: board.id }).unwrap()
      setDeleteOpen(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : errorCopy.board.errors.deleteBoardFailed)
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <Card className={styles.boardItem}>
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
          <div className={styles.label}>{boardCopy.board.boardLanguageLabel}</div>
          <select
            className={styles.select}
            value={currentLanguage}
            onChange={(event) =>
              handleLanguageChange(event.target.value as BoardLanguage)
            }
            disabled={!canEditLanguage || languagePending}
          >
            <option value="ru">{languageLabels.ru}</option>
            <option value="en">{languageLabels.en}</option>
          </select>
        </div>
        {isOwner ? (
          <div className={styles.section}>
            <div className={styles.label}>{boardCopy.board.inviteMember}</div>
            <div className={styles.inviteRow}>
              <input
                className={styles.input}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={boardCopy.board.inviteEmailPlaceholder}
                aria-label={boardCopy.board.inviteEmailPlaceholder}
              />
              <select
                className={styles.select}
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as BoardRole)}
              >
                <option value="editor">{roleLabels[currentLanguage].editor}</option>
                <option value="viewer">{roleLabels[currentLanguage].viewer}</option>
              </select>
              <button
                className={styles.button}
                type="button"
                onClick={handleInvite}
                disabled={invitePending}
              >
                {invitePending
                  ? boardCopy.board.inviteSending
                  : boardCopy.board.inviteButton}
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <div className={styles.boardFooter}>
          <Link
            className={`${styles.button} ${styles.buttonOutline}`}
            href={`/boards/${board.id}`}
          >
            {boardCopy.board.openBoard}
          </Link>
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
                  <button
                    className={`${styles.button} ${styles.buttonOutline}`}
                    type="button"
                    disabled={renamePending}
                  >
                    {boardCopy.board.renameBoard}
                  </button>
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
                      <input
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
                      <button
                        className={styles.button}
                        type="submit"
                        disabled={renamePending}
                      >
                        {renamePending
                          ? boardCopy.board.renamingBoard
                          : boardCopy.board.renameBoard}
                      </button>
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
                  <button
                    className={`${styles.button} ${styles.buttonOutlineDanger}`}
                    type="button"
                    disabled={deletePending}
                  >
                    {boardCopy.board.deleteBoard}
                  </button>
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
                    <button
                      className={`${styles.button} ${styles.buttonDanger}`}
                      type="button"
                      onClick={handleDeleteBoard}
                      disabled={deletePending}
                    >
                      {deletePending
                        ? boardCopy.board.deletingBoard
                        : boardCopy.board.deleteBoard}
                    </button>
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
