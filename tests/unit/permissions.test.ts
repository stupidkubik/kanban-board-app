import { describe, expect, it } from "vitest"

import { canEditBoard, canInviteMembers, getMemberRole, isBoardOwner } from "@/lib/permissions"
import type { Board } from "@/lib/types/boards"

const makeBoard = (overrides?: Partial<Board>): Board => ({
  id: "board-1",
  title: "Board",
  ownerId: "owner",
  members: { owner: true, editor: true, viewer: true },
  roles: { owner: "owner", editor: "editor", viewer: "viewer" },
  language: "en",
  ...overrides,
})

describe("permissions", () => {
  it("resolves roles with fallback", () => {
    const board = makeBoard({
      roles: { owner: "owner" },
      members: { owner: true, editor: true },
    })
    expect(getMemberRole(board, "owner")).toBe("owner")
    expect(getMemberRole(board, "editor")).toBe("editor")
    expect(getMemberRole(board, "missing")).toBeNull()
  })

  it("checks owner and edit access", () => {
    const board = makeBoard()
    expect(isBoardOwner(board, "owner")).toBe(true)
    expect(isBoardOwner(board, "editor")).toBe(false)
    expect(canInviteMembers(board, "owner")).toBe(true)
    expect(canInviteMembers(board, "editor")).toBe(false)
    expect(canEditBoard(board, "viewer")).toBe(false)
    expect(canEditBoard(board, "editor")).toBe(true)
  })
})
