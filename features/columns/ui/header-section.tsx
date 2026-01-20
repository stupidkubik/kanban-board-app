"use client"

import * as React from "react"
import Link from "next/link"

import { languageLabels } from "@/lib/i18n"
import { type BoardCopy } from "@/lib/types/board-ui"
import { type BoardLanguage } from "@/lib/types/boards"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import styles from "@/features/board/ui/board-page.module.css"

type HeaderSectionProps = {
  uiCopy: BoardCopy
  boardTitle: string
  canEdit: boolean
  isViewer: boolean
  boardLanguage: BoardLanguage
  canEditLanguage: boolean
  languagePending: boolean
  showAddColumn: boolean
  creatingColumn: boolean
  newColumnTitle: string
  onNewColumnTitleChange: (value: string) => void
  onToggleAddColumn: (open: boolean) => void
  onCreateColumn: (event: React.FormEvent<HTMLFormElement>) => void
  onBoardLanguageChange: (language: BoardLanguage) => void
}

export function HeaderSection({
  uiCopy,
  boardTitle,
  canEdit,
  isViewer,
  boardLanguage,
  canEditLanguage,
  languagePending,
  showAddColumn,
  creatingColumn,
  newColumnTitle,
  onNewColumnTitleChange,
  onToggleAddColumn,
  onCreateColumn,
  onBoardLanguageChange,
}: HeaderSectionProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={styles.backLink}
            >
              <Link href="/">{uiCopy.board.backToBoards}</Link>
            </Button>
            <h1 className={styles.title}>{boardTitle}</h1>
            {isViewer ? (
              <span className={styles.readOnlyNotice}>
                {uiCopy.board.readOnlyNotice}
              </span>
            ) : null}
          </div>
          <p className={styles.subtitle}>{uiCopy.board.columnsTitle}</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.actionsSecondary}>
            <div className={styles.languageControl}>
              <span className={styles.languageLabel}>
                {uiCopy.board.boardLanguageLabel}
              </span>
              <Select
                value={boardLanguage}
                onValueChange={(value) => onBoardLanguageChange(value as BoardLanguage)}
                disabled={!canEditLanguage || languagePending}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={uiCopy.board.boardLanguageLabel}
                  className={styles.languageSelect}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                  <SelectItem value="en">{languageLabels.en}</SelectItem>
                </SelectContent>
              </Select>
              {languagePending ? (
                <Spinner
                  size="xs"
                  className={styles.languageSpinner}
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <ThemeToggle
              labels={{
                light: uiCopy.common.themeLight,
                dark: uiCopy.common.themeDark,
                switchToLight: uiCopy.common.themeSwitchToLight,
                switchToDark: uiCopy.common.themeSwitchToDark,
              }}
            />
          </div>
          <div className={styles.actionsPrimary}>
            {canEdit ? (
              showAddColumn ? (
                <form className={styles.inlineForm} onSubmit={onCreateColumn}>
                  <Input
                    className={`${styles.columnTitleInput} ${styles.headerColumnInput}`}
                    value={newColumnTitle}
                    onChange={(event) => onNewColumnTitleChange(event.target.value)}
                    placeholder={uiCopy.board.columnNamePlaceholder}
                    aria-label={uiCopy.board.columnNamePlaceholder}
                    disabled={!canEdit || creatingColumn}
                    data-testid="new-column-title"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!canEdit || creatingColumn}
                    data-testid="create-column-submit"
                  >
                    {creatingColumn ? (
                      <Spinner
                        size="sm"
                        className={styles.buttonSpinner}
                        aria-hidden="true"
                      />
                    ) : null}
                    {creatingColumn
                      ? uiCopy.board.creatingColumn
                      : uiCopy.board.createColumn}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onToggleAddColumn(false)
                      onNewColumnTitleChange("")
                    }}
                  >
                    {uiCopy.common.cancel}
                  </Button>
                </form>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className={styles.addColumnButton}
                  onClick={() => onToggleAddColumn(true)}
                  data-testid="add-column-trigger"
                >
                  {uiCopy.board.addColumn}
                </Button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
