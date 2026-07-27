import type { DocumentData } from "firebase-admin/firestore"

import {
  BOARD_LABEL_LIMIT,
  BOARD_LABEL_NAME_LIMIT,
  isBoardLabelColor,
  normalizeLabelName,
} from "@/features/labels/model/label-normalizers"
import type { BoardLabelColor } from "@/lib/types/boards"

export class LabelRouteError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export type LabelBody = {
  name: string
  normalizedName: string
  color: BoardLabelColor
}

export const parseLabelBody = async (request: Request): Promise<LabelBody> => {
  let body: { name?: unknown; color?: unknown }
  try {
    body = (await request.json()) as { name?: unknown; color?: unknown }
  } catch {
    throw new LabelRouteError(400, "Invalid JSON body")
  }
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : ""
  const normalizedName = normalizeLabelName(name)
  if (!name || name.length > BOARD_LABEL_NAME_LIMIT) {
    throw new LabelRouteError(400, "Label name must contain 1 to 50 characters")
  }
  if (!isBoardLabelColor(body.color)) {
    throw new LabelRouteError(400, "Invalid label color")
  }
  return { name, normalizedName, color: body.color }
}

export const assertCanManageLabels = (
  board: DocumentData | undefined,
  uid: string
) => {
  if (!board) {
    throw new LabelRouteError(404, "Board not found")
  }
  if (
    board.members?.[uid] !== true ||
    !["owner", "editor"].includes(board.roles?.[uid])
  ) {
    throw new LabelRouteError(403, "Forbidden")
  }
}

export const getLabelCatalogMaps = (board: DocumentData) => ({
  labelIds:
    board.labelIds && typeof board.labelIds === "object"
      ? { ...board.labelIds }
      : ({} as Record<string, boolean>),
  labelNames:
    board.labelNames && typeof board.labelNames === "object"
      ? { ...board.labelNames }
      : ({} as Record<string, string>),
})

export const assertCatalogHasCapacity = (labelIds: Record<string, boolean>) => {
  if (Object.keys(labelIds).length >= BOARD_LABEL_LIMIT) {
    throw new LabelRouteError(409, "Board label limit reached")
  }
}
