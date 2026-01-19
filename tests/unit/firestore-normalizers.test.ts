import { describe, expect, it } from "vitest"

import type { Board } from "@/lib/types/boards"
import {
  normalizeBoard,
  normalizeColumn,
  normalizeInvite,
  normalizeMemberProfile,
} from "@/lib/store/firestore-normalizers"

describe("firestore normalizers", () => {
  it("normalizes board data and timestamps", () => {
    const createdAt = { toMillis: () => 100 }
    const updatedAt = { toMillis: () => 200 }
    const data = {
      title: "Project",
      members: { "user-1": true },
      roles: { "user-1": "owner" },
      language: "en",
      createdBy: "user-1",
      createdAt,
      updatedAt,
    } as unknown as Omit<Board, "id"> & { createdBy?: string }

    const board = normalizeBoard("board-1", data)

    expect(board).toEqual({
      id: "board-1",
      title: "Project",
      ownerId: "user-1",
      members: { "user-1": true },
      roles: { "user-1": "owner" },
      language: "en",
      createdAt: 100,
      updatedAt: 200,
    })
  })

  it("normalizes invite and invitedBy fallback", () => {
    const createdAt = { toMillis: () => 50 }

    const invite = normalizeInvite("invite-1", {
      boardId: "board-1",
      boardTitle: "Project",
      email: "user@example.com",
      role: "viewer",
      invitedBy: "owner-1",
      createdAt,
    })

    expect(invite).toEqual({
      id: "invite-1",
      boardId: "board-1",
      boardTitle: "Project",
      email: "user@example.com",
      role: "viewer",
      invitedById: "owner-1",
      createdAt: 50,
    })
  })

  it("normalizes member profiles with null defaults", () => {
    const joinedAt = { toMillis: () => 321 }
    const profile = normalizeMemberProfile("user-1", { joinedAt })

    expect(profile).toEqual({
      id: "user-1",
      displayName: null,
      photoURL: null,
      email: null,
      joinedAt: 321,
    })
  })

  it("normalizes columns with default order", () => {
    const column = normalizeColumn("board-1", "column-1", { title: "Todo" })

    expect(column).toEqual({
      id: "column-1",
      boardId: "board-1",
      title: "Todo",
      order: 0,
    })
  })
})
