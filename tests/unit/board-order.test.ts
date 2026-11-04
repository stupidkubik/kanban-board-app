import { describe, expect, it } from "vitest"

import {
  ORDER_GAP,
  formatDateInput,
  getAppendOrder,
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

  it("starts an empty column at one gap", () => {
    expect(getNextOrderValue()).toBe(ORDER_GAP)
  })

  it("appends after the largest order in the column", () => {
    expect(getAppendOrder()).toBe(ORDER_GAP)
    expect(getAppendOrder([{ order: 3000 }, { order: 1000 }])).toBe(4000)
    // Columns that still hold cards created with Date.now() orders.
    expect(getAppendOrder([{ order: 1_762_000_000_000 }])).toBe(
      1_762_000_001_000
    )
  })

  it("detects collapsed numeric gaps and creates stable replacement orders", () => {
    expect(shouldRebalanceOrder(1000, 1000 + Number.EPSILON)).toBe(true)
    expect(shouldRebalanceOrder(1000, 2000)).toBe(false)
    expect(shouldRebalanceOrder(1, 1.0005)).toBe(true)
    expect(getRebalancedOrder(0)).toBe(1000)
    expect(getRebalancedOrder(2)).toBe(3000)
  })

  it("does not rebalance neighbours with Date.now()-scale orders", () => {
    // Cards created ten seconds and one second apart (review finding C3).
    const created = 1_762_000_000_000
    expect(shouldRebalanceOrder(created, created + 10_000)).toBe(false)
    expect(shouldRebalanceOrder(created, created + 1)).toBe(false)
    // Only when midpoints stop being distinct doubles.
    expect(shouldRebalanceOrder(created, created + 0.001)).toBe(true)
    const next = getNextOrderValue(created, created + 1)
    expect(next).toBeGreaterThan(created)
    expect(next).toBeLessThan(created + 1)
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
