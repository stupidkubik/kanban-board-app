"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"

import { languageLabels, type Locale } from "@/lib/i18n"
import { getBoardCoverGradient } from "@/lib/board-cover"
import { type BoardCopy } from "@/lib/types/board-ui"
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
  boardId: string
  boardTitle: string
  canEdit: boolean
  isViewer: boolean
  uiLocale: Locale
  showAddColumn: boolean
  creatingColumn: boolean
  newColumnTitle: string
  onNewColumnTitleChange: (value: string) => void
  onToggleAddColumn: (open: boolean) => void
  onCreateColumn: (event: React.FormEvent<HTMLFormElement>) => void
  onUiLocaleChange: (language: Locale) => void
}

export function HeaderSection({
  uiCopy,
  boardId,
  boardTitle,
  canEdit,
  isViewer,
  uiLocale,
  showAddColumn,
  creatingColumn,
  newColumnTitle,
  onNewColumnTitleChange,
  onToggleAddColumn,
  onCreateColumn,
  onUiLocaleChange,
}: HeaderSectionProps) {
  const headerStyle = React.useMemo(
    () =>
      ({
        "--header-gradient": getBoardCoverGradient(boardId),
      }) as React.CSSProperties,
    [boardId]
  )

  return (
    <div className={styles.header}>
      <div className={styles.headerTop} style={headerStyle}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={styles.backLink}
            >
              <Link href="/">
                <ArrowLeft weight="bold" aria-hidden="true" />
                {uiCopy.board.backToBoards}
              </Link>
            </Button>
            <h1 className={styles.title}>{boardTitle}</h1>
            {isViewer ? (
              <span className={styles.readOnlyNotice}>
                {uiCopy.board.readOnlyNotice}
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.actions}>
          <div className={styles.actionsSecondary}>
            <div className={styles.languageControl}>
              <span className={styles.languageLabel}>
                {uiCopy.common.interfaceLanguage}
              </span>
              <Select
                value={uiLocale}
                onValueChange={(value) => onUiLocaleChange(value as Locale)}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={uiCopy.common.interfaceLanguage}
                  className={styles.languageSelect}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="ru">{languageLabels.ru}</SelectItem>
                <SelectItem value="en">{languageLabels.en}</SelectItem>
              </SelectContent>
              </Select>
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
