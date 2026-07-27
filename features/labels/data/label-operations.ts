import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import type { BoardLabelColor } from "@/lib/types/boards"

export type CreateBoardLabelInput = {
  boardId: string
  name: string
  color: BoardLabelColor
}

export type UpdateBoardLabelInput = CreateBoardLabelInput & {
  labelId: string
}

export type DeleteBoardLabelInput = {
  boardId: string
  labelId: string
}

const requestLabel = async (
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: { name: string; color: BoardLabelColor }
) => {
  const response = await fetchWithAppCheck(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    let message = "Label operation failed"
    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep fallback for a non-JSON server response.
    }
    throw new Error(message)
  }
}

export const createBoardLabel = ({
  boardId,
  name,
  color,
}: CreateBoardLabelInput) =>
  requestLabel(`/api/boards/${encodeURIComponent(boardId)}/labels`, "POST", {
    name,
    color,
  })

export const updateBoardLabel = ({
  boardId,
  labelId,
  name,
  color,
}: UpdateBoardLabelInput) =>
  requestLabel(
    `/api/boards/${encodeURIComponent(boardId)}/labels/${encodeURIComponent(labelId)}`,
    "PATCH",
    { name, color }
  )

export const deleteBoardLabel = ({
  boardId,
  labelId,
}: DeleteBoardLabelInput) =>
  requestLabel(
    `/api/boards/${encodeURIComponent(boardId)}/labels/${encodeURIComponent(labelId)}`,
    "DELETE"
  )
