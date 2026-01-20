"use client"

import * as React from "react"
import { MoonStars, SunDim } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import styles from "@/components/ui/theme-toggle.module.css"

type Theme = "light" | "dark"

type ThemeToggleLabels = {
  light: string
  dark: string
  switchToLight: string
  switchToDark: string
}

type ThemeToggleProps = {
  labels: ThemeToggleLabels
}

const THEME_STORAGE_KEY = "uiTheme"

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute("data-theme", theme)
  document.body?.setAttribute("data-theme", theme)
}

const getInitialTheme = () => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === "light" || stored === "dark") {
    return stored
  }

  return "light"
}

export function ThemeToggle({ labels }: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>("light")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const initialTheme = getInitialTheme()
    setTheme(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) {
      return
    }

    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [mounted, theme])

  const nextTheme = theme === "dark" ? "light" : "dark"
  const actionLabel =
    nextTheme === "dark" ? labels.switchToDark : labels.switchToLight
  const currentLabel = theme === "dark" ? labels.dark : labels.light

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={styles.toggle}
      data-theme={theme}
      aria-label={actionLabel}
      title={actionLabel}
      aria-pressed={theme === "dark"}
      onClick={() => setTheme(nextTheme)}
    >
      <span className={styles.icon} aria-hidden="true">
        {theme === "dark" ? <MoonStars weight="fill" /> : <SunDim weight="fill" />}
      </span>
      <span className={styles.label}>{currentLabel}</span>
    </Button>
  )
}
