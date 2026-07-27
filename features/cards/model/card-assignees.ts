import type { User } from "firebase/auth"

import type { Board, BoardMemberProfile } from "@/lib/types/boards"
import type { CardAssignee } from "@/lib/types/board-ui"

export const normalizeAssigneeIds = (
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
      unique.size < 20
    ) {
      unique.add(item)
    }
  })
  return [...unique]
}

export const buildCardAssignees = (
  board: Board | null,
  profiles: BoardMemberProfile[],
  user: User | null
): CardAssignee[] => {
  if (!board) {
    return []
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  return Object.entries(board.members)
    .filter(([, active]) => active)
    .map(([id]) => {
      const profile = profilesById.get(id)
      const isCurrentUser = id === user?.uid
      const email = profile?.email ?? (isCurrentUser ? user?.email : null) ?? null
      const displayName =
        profile?.displayName ?? (isCurrentUser ? user?.displayName : null)
      return {
        id,
        name: displayName || email || id,
        email,
        photoURL:
          profile?.photoURL ?? (isCurrentUser ? user?.photoURL : null),
      }
    })
}
