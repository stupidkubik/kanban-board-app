import { describe, expect, it } from "vitest"
import type { User } from "firebase/auth"

import {
  buildCardAssignees,
  normalizeAssigneeIds,
} from "@/features/cards/model/card-assignees"
import type { Board } from "@/lib/types/boards"

describe("normalizeAssigneeIds", () => {
  it.each([
    [undefined, []],
    [[], []],
    [["member-1"], ["member-1"]],
    [
      ["member-1", "member-2"],
      ["member-1", "member-2"],
    ],
  ])("normalizes %j", (value, expected) => {
    expect(normalizeAssigneeIds(value)).toEqual(expected)
  })

  it("removes duplicate, invalid, and unavailable assignees", () => {
    expect(
      normalizeAssigneeIds(
        ["member-1", "member-1", 42, "", "outsider", "member-2"],
        new Set(["member-1", "member-2"])
      )
    ).toEqual(["member-1", "member-2"])
  })

  it("caps assignments at twenty members", () => {
    const ids = Array.from({ length: 25 }, (_, index) => `member-${index}`)

    expect(normalizeAssigneeIds(ids)).toEqual(ids.slice(0, 20))
  })
})

describe("buildCardAssignees", () => {
  it("projects only active board members with profile and auth fallbacks", () => {
    const board: Board = {
      id: "board-1",
      title: "Board",
      ownerId: "owner",
      members: {
        owner: true,
        member: true,
        removed: false,
      },
    }
    const user = {
      uid: "owner",
      displayName: "Owner",
      email: "owner@example.com",
      photoURL: "owner.png",
    } as User

    expect(
      buildCardAssignees(
        board,
        [
          {
            id: "member",
            displayName: null,
            email: "member@example.com",
          },
          { id: "removed", displayName: "Removed" },
        ],
        user
      )
    ).toEqual([
      {
        id: "owner",
        name: "Owner",
        email: "owner@example.com",
        photoURL: "owner.png",
      },
      {
        id: "member",
        name: "member@example.com",
        email: "member@example.com",
        photoURL: null,
      },
    ])
  })
})
