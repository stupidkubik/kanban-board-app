import { describe, expect, it, vi } from "vitest"

import {
  formatDateInput,
  getNextOrderValue,
  getRebalancedOrder,
  parseDateInput,
  shouldRebalanceOrder,
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

  it("detects collapsed numeric gaps and creates stable replacement orders", () => {
    expect(shouldRebalanceOrder(1000, 1000 + Number.EPSILON)).toBe(true)
    expect(shouldRebalanceOrder(1000, 2000)).toBe(false)
    expect(getRebalancedOrder(0)).toBe(1000)
    expect(getRebalancedOrder(2)).toBe(3000)
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
