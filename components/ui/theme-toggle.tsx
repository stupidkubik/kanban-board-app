"use client"

import { MoonStars, Sun } from "@phosphor-icons/react"

import { IconButton } from "@/components/ui/icon-button"
import { setStoredTheme, useAppliedTheme } from "@/lib/browser-preferences"
import styles from "@/components/ui/theme-toggle.module.css"

type ThemeToggleLabels = {
  light: string
  dark: string
  switchToLight: string
  switchToDark: string
}

type ThemeToggleProps = {
  labels: ThemeToggleLabels
}

export function ThemeToggle({ labels }: ThemeToggleProps) {
  const theme = useAppliedTheme()

  const nextTheme = theme === "dark" ? "light" : "dark"
  const actionLabel =
    nextTheme === "dark" ? labels.switchToDark : labels.switchToLight
  const currentLabel = theme === "dark" ? labels.dark : labels.light

  return (
    <IconButton
      type="button"
      variant="ghost"
      size="icon-sm"
      className={styles.toggle}
      data-theme={theme}
      label={actionLabel}
      tooltip={actionLabel}
      aria-pressed={theme === "dark"}
      onClick={() => setStoredTheme(nextTheme)}
    >
      <span className={styles.icon} aria-hidden="true">
        {theme === "dark" ? <MoonStars weight="fill" /> : <Sun weight="fill" />}
      </span>
      <span className={styles.label}>{currentLabel}</span>
    </IconButton>
  )
}
