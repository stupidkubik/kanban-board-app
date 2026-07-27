import { BOARD_LABEL_COLORS } from "@/lib/types/boards"
import type {
  BoardLabel,
  BoardLabelColor,
} from "@/lib/types/boards"
import { toMillis } from "@/lib/firestore-values"

export const BOARD_LABEL_LIMIT = 50
export const CARD_LABEL_LIMIT = 10
export const BOARD_LABEL_NAME_LIMIT = 50

export type BoardLabelRecord = {
  name?: unknown
  normalizedName?: unknown
  color?: unknown
  order?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

export const normalizeLabelName = (value: unknown) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : ""

export const isBoardLabelColor = (
  value: unknown
): value is BoardLabelColor =>
  typeof value === "string" &&
  BOARD_LABEL_COLORS.includes(value as BoardLabelColor)

export const normalizeLabelIds = (
  value: unknown,
  allowedIds?: ReadonlySet<string>
) => {
  if (!Array.isArray(value)) {
    return []
  }

  const unique = new Set<string>()
  value.forEach((item) => {
    if (
      typeof item === "string" &&
      item.length > 0 &&
      (!allowedIds || allowedIds.has(item)) &&
      unique.size < CARD_LABEL_LIMIT
    ) {
      unique.add(item)
    }
  })
  return [...unique]
}

export const normalizeBoardLabel = (
  boardId: string,
  id: string,
  data: BoardLabelRecord
): BoardLabel | null => {
  const name = typeof data.name === "string" ? data.name.trim() : ""
  const normalizedName = normalizeLabelName(data.normalizedName || name)
  if (
    !name ||
    name.length > BOARD_LABEL_NAME_LIMIT ||
    !normalizedName ||
    !isBoardLabelColor(data.color)
  ) {
    return null
  }

  const label: BoardLabel = {
    id,
    boardId,
    name,
    normalizedName,
    color: data.color,
    order: typeof data.order === "number" ? data.order : 0,
  }
  const createdAt = toMillis(data.createdAt)
  const updatedAt = toMillis(data.updatedAt)
  if (createdAt !== undefined) label.createdAt = createdAt
  if (updatedAt !== undefined) label.updatedAt = updatedAt
  return label
}
