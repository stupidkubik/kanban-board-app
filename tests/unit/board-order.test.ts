import { describe, expect, it, vi } from "vitest"

import {
  formatDateInput,
  getNextOrderValue,
  parseDateInput,
} from "@/lib/board-order"

describe("board-order", () => {
  it("calculates the middle order when both neighbors exist", () => {
    expect(getNextOrderValue(10, 30)).toBe(20)
  })

  it("adds a gap when only the previous order exists", () => {
    expect(getNextOrderValue(100, undefined)).toBe(1100)
  })

  it("subtracts a gap when only the next order exists", () => {
    expect(getNextOrderValue(undefined, 1000)).toBe(0)
  })

  it("falls back to Date.now when no neighbors exist", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-04-05T12:00:00Z"))
    expect(getNextOrderValue()).toBe(Date.now())
    vi.useRealTimers()
  })

  it("formats and parses date inputs", () => {
    const value = new Date(2024, 0, 5).getTime()
    expect(formatDateInput(value)).toBe("2024-01-05")

    const parsed = parseDateInput("2024-01-05")
    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2024)
    expect(parsed?.getMonth()).toBe(0)
    expect(parsed?.getDate()).toBe(5)
  })

  it("rejects invalid date inputs", () => {
    expect(parseDateInput("")).toBeNull()
    expect(parseDateInput("2024-xx-10")).toBeNull()
  })
})
