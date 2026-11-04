import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import type { BoardLabelColor } from "@/lib/types/boards"
import { readApiError } from "@/lib/errors"

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
    throw await readApiError(response, "Label operation failed")
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

export const deleteBoardLabel = ({ boardId, labelId }: DeleteBoardLabelInput) =>
  requestLabel(
    `/api/boards/${encodeURIComponent(boardId)}/labels/${encodeURIComponent(labelId)}`,
    "DELETE"
  )
