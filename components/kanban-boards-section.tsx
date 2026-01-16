"use client"

import * as React from "react"
import { type User } from "firebase/auth"

import { getCopy, languageLabels, type Locale } from "@/lib/i18n"
import { type Board, type BoardLanguage } from "@/lib/types/boards"
import { useCreateBoardMutation } from "@/lib/store/firestore-api"
import { KanbanBoardCard } from "@/components/kanban-board-card"
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
import styles from "@/components/kanban-app.module.css"

type KanbanBoardsSectionProps = {
  boards: Board[]
  onError: (message: string | null) => void
  uiCopy: ReturnType<typeof getCopy>
  uiLocale: Locale
  user: User
}

export function KanbanBoardsSection({
  boards,
  onError,
  uiCopy,
  uiLocale,
  user,
}: KanbanBoardsSectionProps) {
  const [createBoardMutation, { isLoading: creating }] =
    useCreateBoardMutation()
  const [title, setTitle] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newBoardLanguage, setNewBoardLanguage] =
    React.useState<BoardLanguage>("ru")
  const [newBoardLanguageTouched, setNewBoardLanguageTouched] =
    React.useState(false)

  React.useEffect(() => {
    if (!newBoardLanguageTouched) {
      setNewBoardLanguage(uiLocale)
    }
  }, [newBoardLanguageTouched, uiLocale])

  const createBoard = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      onError(uiCopy.board.errors.boardTitleRequired)
      return false
    }

    onError(null)

    try {
      await createBoardMutation({
        title: trimmed,
        ownerId: user.uid,
        language: newBoardLanguage,
        ownerDisplayName: user.displayName ?? null,
        ownerEmail: user.email ?? null,
        ownerPhotoURL: user.photoURL ?? null,
      }).unwrap()
      setTitle("")
      return true
    } catch (err) {
      onError(err instanceof Error ? err.message : uiCopy.board.errors.createBoardFailed)
      return false
    }
  }

  const handleCreateBoardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const created = await createBoard()
    if (created) {
      setCreateOpen(false)
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{uiCopy.board.boardSectionTitle}</h3>
        <p className={styles.cardSubtitle}>{uiCopy.board.boardSectionSubtitle}</p>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.actionsRow}>
          <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
            <AlertDialogTrigger asChild>
              <button className={styles.button} type="button">
                {uiCopy.board.createBoard}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{uiCopy.board.createBoard}</AlertDialogTitle>
                <AlertDialogDescription>
                  {uiCopy.board.boardSectionSubtitle}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form className={styles.modalForm} onSubmit={handleCreateBoardSubmit}>
                <div className={styles.modalFields}>
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={uiCopy.board.boardNamePlaceholder}
                    aria-label={uiCopy.board.boardNamePlaceholder}
                  />
                  <select
                    className={styles.select}
                    value={newBoardLanguage}
                    onChange={(event) => {
                      setNewBoardLanguage(event.target.value as BoardLanguage)
                      setNewBoardLanguageTouched(true)
                    }}
                  >
                    <option value="ru">{languageLabels.ru}</option>
                    <option value="en">{languageLabels.en}</option>
                  </select>
                </div>
                <AlertDialogFooter className={styles.modalFooter}>
                  <AlertDialogCancel type="button">
                    {uiCopy.common.cancel}
                  </AlertDialogCancel>
                  <button className={styles.button} type="submit" disabled={creating}>
                    {creating ? uiCopy.board.creatingBoard : uiCopy.board.createBoard}
                  </button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className={styles.boardGrid}>
          {boards.length ? (
            boards.map((board) => (
              <KanbanBoardCard
                key={board.id}
                board={board}
                onError={onError}
                uiLocale={uiLocale}
                user={user}
              />
            ))
          ) : (
            <p className={styles.muted}>{uiCopy.board.noBoards}</p>
          )}
        </div>
      </div>
    </section>
  )
}
