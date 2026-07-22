import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import {
  setStoredBoardsSortDirection,
  setStoredBoardsSortKey,
  setStoredTheme,
  setStoredUiLocale,
  setUiLocaleTouched,
  useStoredBoardsSortDirection,
  useStoredBoardsSortKey,
  useStoredTheme,
  useStoredUiLocale,
  useUiLocaleTouched,
} from "@/lib/browser-preferences"

beforeEach(() => {
  window.localStorage.clear()
})

describe("browser preferences", () => {
  it("uses defaults and reacts immediately to locale changes", () => {
    const { result } = renderHook(() => ({
      locale: useStoredUiLocale(),
      touched: useUiLocaleTouched(),
    }))

    expect(result.current).toEqual({ locale: "en", touched: false })

    act(() => {
      setStoredUiLocale("ru")
      setUiLocaleTouched(true)
    })

    expect(result.current).toEqual({ locale: "ru", touched: true })
  })

  it("persists theme and board sorting preferences", () => {
    const { result } = renderHook(() => ({
      theme: useStoredTheme(),
      sortKey: useStoredBoardsSortKey(),
      sortDirection: useStoredBoardsSortDirection(),
    }))

    act(() => {
      setStoredTheme("dark")
      setStoredBoardsSortKey("title")
      setStoredBoardsSortDirection("asc")
    })

    expect(result.current).toEqual({
      theme: "dark",
      sortKey: "title",
      sortDirection: "asc",
    })
    expect(window.localStorage.getItem("uiTheme")).toBe("dark")
    expect(window.localStorage.getItem("boardsSortKey")).toBe("title")
    expect(window.localStorage.getItem("boardsSortDirection")).toBe("asc")
  })
})
