"use client"

import * as React from "react"
import { Gear, Plus, Tag } from "@phosphor-icons/react"
import type { User } from "firebase/auth"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconButton } from "@/components/ui/icon-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { languageLabels, type Locale } from "@/lib/i18n"
import { setStoredTheme, useAppliedTheme } from "@/lib/browser-preferences"
import type { Board, BoardLanguage } from "@/lib/types/boards"
import type { BoardCopy } from "@/lib/types/board-ui"
import { LabelsSection } from "@/features/labels/ui/labels-section"
import { ParticipantsSection } from "@/features/participants/ui/participants-section"
import styles from "@/features/board/ui/board-toolbar.module.css"

type BoardToolbarProps = {
  boardId: string
  board: Board | null
  user: User | null
  canEdit: boolean
  isOwner: boolean
  uiCopy: BoardCopy
  uiLocale: Locale
  onUiLocaleChange: (locale: Locale) => void
  boardLanguage: BoardLanguage
  updatingBoardLanguage: boolean
  onBoardLanguageChange: (language: BoardLanguage) => void
  creatingColumn: boolean
  newColumnTitle: string
  onNewColumnTitleChange: (value: string) => void
  onCreateColumn: (event: React.FormEvent<HTMLFormElement>) => void
  setError: (message: string | null) => void
}

export function BoardToolbar({
  boardId,
  board,
  user,
  canEdit,
  isOwner,
  uiCopy,
  uiLocale,
  onUiLocaleChange,
  boardLanguage,
  updatingBoardLanguage,
  onBoardLanguageChange,
  creatingColumn,
  newColumnTitle,
  onNewColumnTitleChange,
  onCreateColumn,
  setError,
}: BoardToolbarProps) {
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const settingsTriggerRef = React.useRef<HTMLButtonElement>(null)
  const theme = useAppliedTheme()

  return (
    <section className={styles.toolbar} aria-label={uiCopy.board.columnsTitle}>
      <div className={styles.managementActions}>
        <ParticipantsSection
          boardId={boardId}
          board={board}
          user={user}
          isOwner={isOwner}
          uiCopy={uiCopy}
          uiLocale={uiLocale}
          setError={setError}
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" data-testid="labels-manager-trigger">
              <Tag weight="bold" aria-hidden="true" />
              {uiCopy.board.labelsManager}
            </Button>
          </DialogTrigger>
          <DialogContent size="lg" className={styles.managerDialog}>
            <DialogHeader className={styles.managerHeader}>
              <DialogTitle>{uiCopy.board.labelsManager}</DialogTitle>
              <DialogDescription className="srOnly">
                {uiCopy.board.labelsDescription}
              </DialogDescription>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm" data-testid="close-labels-manager">
                  {uiCopy.common.cancel}
                </Button>
              </DialogClose>
            </DialogHeader>
            <LabelsSection boardId={boardId} canEdit={canEdit} uiCopy={uiCopy} setError={setError} />
          </DialogContent>
        </Dialog>
      </div>

      {canEdit ? (
        <form className={styles.createColumnForm} onSubmit={onCreateColumn}>
          <Label className="srOnly" htmlFor="board-new-column-title">
            {uiCopy.board.columnNamePlaceholder}
          </Label>
          <Input
            id="board-new-column-title"
            value={newColumnTitle}
            onChange={(event) => onNewColumnTitleChange(event.target.value)}
            placeholder={uiCopy.board.columnNamePlaceholder}
            disabled={creatingColumn}
            data-testid="new-column-title"
          />
          <Button type="submit" size="sm" disabled={creatingColumn} data-testid="create-column-submit">
            {creatingColumn ? <Spinner size="sm" aria-hidden="true" /> : <Plus weight="bold" aria-hidden="true" />}
            {creatingColumn ? uiCopy.board.creatingColumn : uiCopy.board.addColumn}
          </Button>
        </form>
      ) : null}

      <div className={styles.settingsActions}>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <IconButton
            type="button"
            variant="ghost"
            size="icon-sm"
            label={uiCopy.board.boardSettings}
            ref={settingsTriggerRef}
            onClick={() => setSettingsOpen(true)}
          >
            <Gear weight="bold" aria-hidden="true" />
          </IconButton>
          <DialogContent
            size="sm"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              settingsTriggerRef.current?.focus()
            }}
          >
            <DialogHeader>
              <DialogTitle>{uiCopy.board.boardSettings}</DialogTitle>
              <DialogDescription>{uiCopy.board.boardSettingsDescription}</DialogDescription>
            </DialogHeader>
            <div className={styles.settingsBody}>
              <Label htmlFor={`board-content-language-${boardId}`}>
                {uiCopy.board.boardLanguageLabel}
              </Label>
              <Select
                value={boardLanguage}
                disabled={!canEdit || updatingBoardLanguage}
                onValueChange={(value) => onBoardLanguageChange(value as BoardLanguage)}
              >
                <SelectTrigger id={`board-content-language-${boardId}`} aria-label={uiCopy.board.boardLanguageLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                  <SelectItem value="en">{languageLabels.en}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton type="button" variant="ghost" size="icon-sm" label={uiCopy.board.personalSettings}>
              <Gear weight="bold" aria-hidden="true" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={styles.personalMenu}>
            <DropdownMenuLabel>{uiCopy.board.personalSettings}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{uiCopy.common.interfaceLanguage}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={uiLocale} onValueChange={(value) => onUiLocaleChange(value as Locale)}>
              <DropdownMenuRadioItem value="ru">{languageLabels.ru}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">{languageLabels.en}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{theme === "dark" ? uiCopy.common.themeDark : uiCopy.common.themeLight}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setStoredTheme(value as "light" | "dark")}>
              <DropdownMenuRadioItem value="light">{uiCopy.common.themeLight}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">{uiCopy.common.themeDark}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  )
}
