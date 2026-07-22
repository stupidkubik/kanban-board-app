"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"

import { languageLabels, type Locale } from "@/lib/i18n"
import type { BoardLanguage } from "@/lib/types/boards"
import { getBoardCoverGradient } from "@/lib/board-cover"
import { type BoardCopy } from "@/lib/types/board-ui"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  isViewer: boolean
  boardLanguage: BoardLanguage
  canEdit: boolean
  updatingBoardLanguage: boolean
  onBoardLanguageChange: (language: BoardLanguage) => void
  uiLocale: Locale
  onUiLocaleChange: (language: Locale) => void
}

export function HeaderSection({
  uiCopy,
  boardId,
  boardTitle,
  isViewer,
  boardLanguage,
  canEdit,
  updatingBoardLanguage,
  onBoardLanguageChange,
  uiLocale,
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
              <Label
                className={styles.languageLabel}
                htmlFor={`board-content-language-${boardId}`}
              >
                {uiCopy.board.boardLanguageLabel}
              </Label>
              <Select
                value={boardLanguage}
                disabled={!canEdit || updatingBoardLanguage}
                onValueChange={(value) =>
                  onBoardLanguageChange(value as BoardLanguage)
                }
              >
                <SelectTrigger
                  id={`board-content-language-${boardId}`}
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
            </div>
            <div className={styles.languageControl}>
              <Label
                className={styles.languageLabel}
                htmlFor={`board-language-${boardId}`}
              >
                {uiCopy.common.interfaceLanguage}
              </Label>
              <Select
                value={uiLocale}
                onValueChange={(value) => onUiLocaleChange(value as Locale)}
              >
                <SelectTrigger
                  id={`board-language-${boardId}`}
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
        </div>
      </div>
    </div>
  )
}
