import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"
import type { BoardRole } from "@/lib/types/boards"

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
    let message = "Update member role failed"
    try {
      const payload = (await response.json()) as { error?: string }
      message = payload.error ?? message
    } catch {
      // Keep the fallback when the server does not return JSON.
    }
    throw new Error(message)
  }
}
