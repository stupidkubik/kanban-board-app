"use client"

import * as React from "react"
import Link from "next/link"

import { type BoardCopy } from "@/lib/types/board-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import styles from "@/features/board/ui/board-page.module.css"

type HeaderSectionProps = {
  uiCopy: BoardCopy
  boardTitle: string
  canEdit: boolean
  isViewer: boolean
  showAddColumn: boolean
  creatingColumn: boolean
  newColumnTitle: string
  onNewColumnTitleChange: (value: string) => void
  onToggleAddColumn: (open: boolean) => void
  onCreateColumn: (event: React.FormEvent<HTMLFormElement>) => void
}

export function HeaderSection({
  uiCopy,
  boardTitle,
  canEdit,
  isViewer,
  showAddColumn,
  creatingColumn,
  newColumnTitle,
  onNewColumnTitleChange,
  onToggleAddColumn,
  onCreateColumn,
}: HeaderSectionProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleBlock}>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={styles.backLink}
        >
          <Link href="/">{uiCopy.board.backToBoards}</Link>
        </Button>
        <h1 className={styles.title}>{boardTitle}</h1>
        <p className={styles.subtitle}>{uiCopy.board.columnsTitle}</p>
      </div>
      <div className={styles.actions}>
        <ThemeToggle
          labels={{
            light: uiCopy.common.themeLight,
            dark: uiCopy.common.themeDark,
            switchToLight: uiCopy.common.themeSwitchToLight,
            switchToDark: uiCopy.common.themeSwitchToDark,
          }}
        />
        {canEdit ? (
          showAddColumn ? (
            <form className={styles.inlineForm} onSubmit={onCreateColumn}>
              <Input
                className={styles.columnTitleInput}
                value={newColumnTitle}
                onChange={(event) => onNewColumnTitleChange(event.target.value)}
                placeholder={uiCopy.board.columnNamePlaceholder}
                aria-label={uiCopy.board.columnNamePlaceholder}
                disabled={!canEdit || creatingColumn}
                data-testid="new-column-title"
              />
              <Button
                type="submit"
                disabled={!canEdit || creatingColumn}
                data-testid="create-column-submit"
              >
                {creatingColumn ? (
                  <Spinner size="sm" className={styles.buttonSpinner} aria-hidden="true" />
                ) : null}
                {creatingColumn
                  ? uiCopy.board.creatingColumn
                  : uiCopy.board.createColumn}
              </Button>
              <Button
                type="button"
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
              onClick={() => onToggleAddColumn(true)}
              data-testid="add-column-trigger"
            >
              {uiCopy.board.addColumn}
            </Button>
          )
        ) : null}
        {isViewer ? (
          <span className={styles.readOnlyNotice}>
            {uiCopy.board.readOnlyNotice}
          </span>
        ) : null}
      </div>
    </div>
  )
}
