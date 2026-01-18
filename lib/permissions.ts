import type { Board, BoardRole } from "@/lib/types/boards"

/**
 * Returns the role for a board member. Defaults to "editor" for members without an explicit role.
 */
export const getMemberRole = (
  board: Board,
  uid?: string | null
): BoardRole | null => {
  if (!uid || !board.members[uid]) {
    return null
  }

  const explicitRole = board.roles?.[uid]
  if (explicitRole) {
    return explicitRole
  }

  if (board.ownerId === uid) {
    return "owner"
  }

  return "editor"
}

export const isBoardOwner = (board: Board, uid?: string | null) => {
  return !!uid && board.ownerId === uid
}

export const canEditBoard = (board: Board, uid?: string | null) => {
  const role = getMemberRole(board, uid)
  return role !== null && role !== "viewer"
}

export const canInviteMembers = (board: Board, uid?: string | null) => {
  return isBoardOwner(board, uid)
}
