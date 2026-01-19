// Keep gaps so we can insert cards without reindexing whole columns.
export const ORDER_GAP = 1000

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

  return Date.now()
}

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
