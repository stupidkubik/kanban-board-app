"use client"

import * as React from "react"
import { type User } from "firebase/auth"

import { getCopy, languageLabels, type Locale } from "@/lib/i18n"
import { type Board, type BoardLanguage } from "@/lib/types/boards"
import { useCreateBoardMutation } from "@/lib/store/firestore-api"
import { KanbanBoardCard } from "@/features/boards/ui/board-card"
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
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import styles from "@/features/home/ui/kanban-app.module.css"

type KanbanBoardsSectionProps = {
  boards: Board[]
  onError: (message: string | null) => void
  uiCopy: ReturnType<typeof getCopy>
  uiLocale: Locale
  user: User
}

type SortKey = "createdAt" | "title"
type SortDirection = "asc" | "desc"

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
    React.useState<BoardLanguage>("en")
  const [newBoardLanguageTouched, setNewBoardLanguageTouched] =
    React.useState(false)
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc")

  React.useEffect(() => {
    const storedKey = window.localStorage.getItem("boardsSortKey")
    const storedDirection = window.localStorage.getItem("boardsSortDirection")
    if (storedKey === "createdAt" || storedKey === "title") {
      setSortKey(storedKey)
    }
    if (storedDirection === "asc" || storedDirection === "desc") {
      setSortDirection(storedDirection)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem("boardsSortKey", sortKey)
  }, [sortKey])

  React.useEffect(() => {
    window.localStorage.setItem("boardsSortDirection", sortDirection)
  }, [sortDirection])

  const sortedBoards = React.useMemo(() => {
    const nextBoards = [...boards]
    const locale = uiLocale === "ru" ? "ru" : "en"

    nextBoards.sort((a, b) => {
      let compare = 0
      if (sortKey === "title") {
        compare = a.title.localeCompare(b.title, locale, { sensitivity: "base" })
      } else {
        const aCreated = a.createdAt ?? 0
        const bCreated = b.createdAt ?? 0
        compare = aCreated - bCreated
        if (compare === 0) {
          compare = a.title.localeCompare(b.title, locale, { sensitivity: "base" })
        }
      }
      return sortDirection === "asc" ? compare : -compare
    })

    return nextBoards
  }, [boards, sortDirection, sortKey, uiLocale])

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
    <Card asChild className={styles.card}>
      <section>
        <div className={`${styles.cardHeader} ${styles.sectionHeader}`}>
          <div>
            <h3 className={styles.cardTitle}>{uiCopy.board.boardSectionTitle}</h3>
            <p className={styles.cardSubtitle}>{uiCopy.board.boardSectionSubtitle}</p>
          </div>
          <div className={styles.sectionControls}>
            <div className={styles.sortControls}>
              <Label className={styles.sortLabel} htmlFor="boards-sort-key">
                {uiCopy.board.sortLabel}
              </Label>
              <Select
                value={sortKey}
                onValueChange={(value) => setSortKey(value as SortKey)}
              >
                <SelectTrigger
                  id="boards-sort-key"
                  size="sm"
                  aria-label={uiCopy.board.sortLabel}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">
                    {uiCopy.board.sortByCreated}
                  </SelectItem>
                  <SelectItem value="title">
                    {uiCopy.board.sortByTitle}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortDirection}
                onValueChange={(value) => setSortDirection(value as SortDirection)}
              >
                <SelectTrigger
                  id="boards-sort-direction"
                  size="sm"
                  aria-label={uiCopy.board.sortDirectionLabel}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{uiCopy.board.sortAscending}</SelectItem>
                  <SelectItem value="desc">{uiCopy.board.sortDescending}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" data-testid="create-board-trigger">
                  {uiCopy.board.createBoard}
                </Button>
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
                    <Field>
                      <FieldLabel className="srOnly" htmlFor="create-board-title">
                        {uiCopy.board.boardNamePlaceholder}
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="create-board-title"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder={uiCopy.board.boardNamePlaceholder}
                          aria-label={uiCopy.board.boardNamePlaceholder}
                          data-testid="create-board-title"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel className="srOnly" htmlFor="create-board-language">
                        {uiCopy.board.boardLanguageLabel}
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={newBoardLanguage}
                          onValueChange={(value) => {
                            setNewBoardLanguage(value as BoardLanguage)
                            setNewBoardLanguageTouched(true)
                          }}
                        >
                          <SelectTrigger
                            id="create-board-language"
                            aria-label={uiCopy.board.boardLanguageLabel}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                            <SelectItem value="en">{languageLabels.en}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                  </div>
                  <AlertDialogFooter className={styles.modalFooter}>
                    <AlertDialogCancel type="button">
                      {uiCopy.common.cancel}
                    </AlertDialogCancel>
                    <Button
                      type="submit"
                      disabled={creating}
                      data-testid="create-board-submit"
                    >
                      {creating ? (
                        <Spinner
                          size="sm"
                          className={styles.buttonSpinner}
                          aria-hidden="true"
                        />
                      ) : null}
                      {creating ? uiCopy.board.creatingBoard : uiCopy.board.createBoard}
                    </Button>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.boardGrid}>
            {sortedBoards.length ? (
              sortedBoards.map((board) => (
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
    </Card>
  )
}
