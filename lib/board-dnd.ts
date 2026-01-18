const columnDropPrefix = "column:"

export const getColumnDropId = (columnId: string) => `${columnDropPrefix}${columnId}`

export const getColumnIdFromDropId = (value: string) =>
  value.startsWith(columnDropPrefix) ? value.slice(columnDropPrefix.length) : null
