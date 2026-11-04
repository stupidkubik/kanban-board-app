// Keep gaps so we can insert cards without reindexing whole columns.
export const ORDER_GAP = 1000
// Absolute, not relative: cards created before 2026-11 have Date.now()
// orders (~1.7e12), and a relative 1e-6 threshold fired on nearly every drop.
const MIN_ORDER_GAP = 0.001
// Midpoints stop being distinct doubles well before the gap reaches zero.
const PRECISION_GAP_FACTOR = 16

export const getNextOrderValue = (before?: number, after?: number) => {
  if (typeof before === "number" && typeof after === "number") {
    const middle = (before + after) / 2
    if (Number.isFinite(middle)) {
      return middle
    }
  }

  if (typeof before === "number") {
    return before + ORDER_GAP
  }

  if (typeof after === "number") {
    return after - ORDER_GAP
  }

  return ORDER_GAP
}

// Order for a card added at the end of a column.
export const getAppendOrder = (cards: readonly { order: number }[] = []) => {
  const last = cards.reduce(
    (max, card) =>
      Number.isFinite(card.order) ? Math.max(max, card.order) : max,
    -Infinity
  )
  return Number.isFinite(last) ? last + ORDER_GAP : ORDER_GAP
}

export const shouldRebalanceOrder = (before?: number, after?: number) => {
  if (typeof before !== "number" || typeof after !== "number") {
    return false
  }
  const gap = after - before
  const precisionGap =
    Number.EPSILON *
    Math.max(Math.abs(before), Math.abs(after)) *
    PRECISION_GAP_FACTOR
  return !Number.isFinite(gap) || gap <= Math.max(MIN_ORDER_GAP, precisionGap)
}

export const getRebalancedOrder = (index: number) => (index + 1) * ORDER_GAP

export const formatDateInput = (value?: number) => {
  if (!value) {
    return ""
  }
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const parseDateInput = (value: string) => {
  if (!value) {
    return null
  }
  const [year, month, day] = value.split("-").map((part) => Number(part))
  if (!year || !month || !day) {
    return null
  }
  return new Date(year, month - 1, day)
}
