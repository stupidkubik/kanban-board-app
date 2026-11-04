import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import type { BoardRole } from "@/lib/types/boards"
import { readApiError } from "@/lib/errors"

export type EditableBoardRole = Exclude<BoardRole, "owner">

export type UpdateBoardMemberRoleInput = {
  boardId: string
  memberId: string
  role: EditableBoardRole
}

export const updateBoardMemberRole = async ({
  boardId,
  memberId,
  role,
}: UpdateBoardMemberRoleInput) => {
  const response = await fetchWithAppCheck(
    `/api/boards/${encodeURIComponent(boardId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }
  )

  if (!response.ok) {
    throw await readApiError(response, "Update member role failed")
  }
}
