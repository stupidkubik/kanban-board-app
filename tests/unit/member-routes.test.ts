// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const boardRef = {
    kind: "board",
    collection: vi.fn(),
    get: vi.fn(),
  }
  const assignedCardsQuery = {
    get: vi.fn(),
    limit: vi.fn(),
    where: vi.fn(),
  }
  const batch = {
    commit: vi.fn(),
    update: vi.fn(),
  }
  const inviteRef = { kind: "invite" }
  const profileRef = { kind: "profile" }
  const transaction = {
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  }

  return {
    boardRef,
    assignedCardsQuery,
    batch,
    getSession: vi.fn(),
    inviteRef,
    profileRef,
    runTransaction: vi.fn(),
    transaction,
    verifyAppCheckToken: vi.fn(),
  }
})

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn((name: string) => ({
      doc: vi.fn(() =>
        name === "boardInvites" ? mocks.inviteRef : mocks.boardRef
      ),
    })),
    batch: vi.fn(() => mocks.batch),
    runTransaction: mocks.runTransaction,
  },
}))

vi.mock("@/lib/firebase/app-check", () => ({
  verifyAppCheckToken: mocks.verifyAppCheckToken,
}))

vi.mock("@/lib/firebase/session", () => ({
  getSession: mocks.getSession,
}))

import {
  DELETE as deleteMember,
  PATCH as updateMemberRole,
} from "@/app/api/boards/[boardId]/members/[memberId]/route"
import { POST as acceptInvite } from "@/app/api/invites/[inviteId]/accept/route"

const boardId = "board-1"
const memberId = "editor"
const boardSnapshot = {
  exists: true,
  data: () => ({
    ownerId: "owner",
    members: { owner: true, editor: true, viewer: true },
    roles: { owner: "owner", editor: "editor", viewer: "viewer" },
  }),
}

const jsonRequest = (url: string, body: unknown, method: string) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("member server routes", () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.runTransaction.mockReset()
    mocks.transaction.delete.mockReset()
    mocks.transaction.get.mockReset()
    mocks.transaction.set.mockReset()
    mocks.transaction.update.mockReset()
    mocks.verifyAppCheckToken.mockReset()
    mocks.boardRef.collection.mockReset()
    mocks.boardRef.get.mockReset()
    mocks.assignedCardsQuery.get.mockReset()
    mocks.assignedCardsQuery.limit.mockReset()
    mocks.assignedCardsQuery.where.mockReset()
    mocks.batch.commit.mockReset()
    mocks.batch.update.mockReset()

    mocks.verifyAppCheckToken.mockResolvedValue({ ok: true })
    mocks.boardRef.get.mockResolvedValue(boardSnapshot)
    mocks.assignedCardsQuery.get.mockResolvedValue({
      docs: [],
      empty: true,
      size: 0,
    })
    mocks.assignedCardsQuery.limit.mockReturnValue(mocks.assignedCardsQuery)
    mocks.assignedCardsQuery.where.mockReturnValue(mocks.assignedCardsQuery)
    mocks.batch.commit.mockResolvedValue(undefined)
    mocks.boardRef.collection.mockImplementation((name: string) =>
      name === "cards"
        ? mocks.assignedCardsQuery
        : { doc: vi.fn(() => mocks.profileRef) }
    )
    mocks.runTransaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => Promise<void>) =>
        callback(mocks.transaction)
    )
  })

  it("rejects an unauthenticated member removal before reading Firestore", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await deleteMember(
      new Request("https://example.test/api/boards/board-1/members/editor", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ boardId, memberId }) }
    )

    expect(response.status).toBe(401)
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it("rejects removal of another member by a non-owner", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "editor",
      email: "editor@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)

    const response = await deleteMember(
      new Request("https://example.test/api/boards/board-1/members/viewer", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ boardId, memberId: "viewer" }) }
    )

    expect(response.status).toBe(403)
    expect(mocks.transaction.update).not.toHaveBeenCalled()
    expect(mocks.transaction.delete).not.toHaveBeenCalled()
  })

  it("removes members and roles together with the member profile", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)

    const response = await deleteMember(
      new Request("https://example.test/api/boards/board-1/members/editor", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ boardId, memberId }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.boardRef,
      expect.objectContaining({
        members: { owner: true, viewer: true },
        roles: { owner: "owner", viewer: "viewer" },
      })
    )
    expect(mocks.transaction.delete).toHaveBeenCalledWith(mocks.profileRef)
  })

  it("removes the member from assigned cards before deleting membership", async () => {
    const firstCardRef = { kind: "card", id: "card-1" }
    const secondCardRef = { kind: "card", id: "card-2" }
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)
    mocks.assignedCardsQuery.get.mockResolvedValue({
      docs: [{ ref: firstCardRef }, { ref: secondCardRef }],
      empty: false,
      size: 2,
    })

    const response = await deleteMember(
      new Request("https://example.test/api/boards/board-1/members/editor", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ boardId, memberId }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.assignedCardsQuery.where).toHaveBeenCalledWith(
      "assigneeIds",
      "array-contains",
      memberId
    )
    expect(mocks.batch.update).toHaveBeenCalledTimes(2)
    expect(mocks.batch.update).toHaveBeenCalledWith(
      firstCardRef,
      expect.objectContaining({ assigneeIds: expect.anything() })
    )
    expect(mocks.batch.commit).toHaveBeenCalledOnce()
  })

  it("rejects member removal when assignment cleanup exceeds the batch limit", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.assignedCardsQuery.get.mockResolvedValue({
      docs: [],
      empty: false,
      size: 501,
    })

    const response = await deleteMember(
      new Request("https://example.test/api/boards/board-1/members/editor", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ boardId, memberId }) }
    )

    expect(response.status).toBe(409)
    expect(mocks.batch.commit).not.toHaveBeenCalled()
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it.each([
    ["editor", "viewer"],
    ["viewer", "editor"],
  ] as const)("lets the owner change %s to %s", async (targetId, role) => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)

    const response = await updateMemberRole(
      jsonRequest(
        `https://example.test/api/boards/${boardId}/members/${targetId}`,
        { role },
        "PATCH"
      ),
      { params: Promise.resolve({ boardId, memberId: targetId }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.boardRef,
      expect.objectContaining({
        roles: expect.objectContaining({ [targetId]: role }),
      })
    )
  })

  it.each(["editor", "viewer"])(
    "rejects a role change by a %s",
    async (actorId) => {
      mocks.getSession.mockResolvedValue({
        uid: actorId,
        email: `${actorId}@example.com`,
      })
      mocks.transaction.get.mockResolvedValue(boardSnapshot)

      const response = await updateMemberRole(
        jsonRequest(
          `https://example.test/api/boards/${boardId}/members/viewer`,
          { role: "editor" },
          "PATCH"
        ),
        { params: Promise.resolve({ boardId, memberId: "viewer" }) }
      )

      expect(response.status).toBe(403)
      expect(mocks.transaction.update).not.toHaveBeenCalled()
    }
  )

  it("rejects changes to the owner role", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)

    const response = await updateMemberRole(
      jsonRequest(
        `https://example.test/api/boards/${boardId}/members/owner`,
        { role: "viewer" },
        "PATCH"
      ),
      { params: Promise.resolve({ boardId, memberId: "owner" }) }
    )

    expect(response.status).toBe(409)
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })

  it("returns 404 for a missing board member", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)

    const response = await updateMemberRole(
      jsonRequest(
        `https://example.test/api/boards/${boardId}/members/missing`,
        { role: "viewer" },
        "PATCH"
      ),
      { params: Promise.resolve({ boardId, memberId: "missing" }) }
    )

    expect(response.status).toBe(404)
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })

  it("rejects an invalid role before reading Firestore", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })

    const response = await updateMemberRole(
      jsonRequest(
        `https://example.test/api/boards/${boardId}/members/editor`,
        { role: "owner" },
        "PATCH"
      ),
      { params: Promise.resolve({ boardId, memberId }) }
    )

    expect(response.status).toBe(400)
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it("treats a repeated role as an idempotent success", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.transaction.get.mockResolvedValue(boardSnapshot)

    const response = await updateMemberRole(
      jsonRequest(
        `https://example.test/api/boards/${boardId}/members/editor`,
        { role: "editor" },
        "PATCH"
      ),
      { params: Promise.resolve({ boardId, memberId }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })

  it("accepts a matching invite and synchronizes members and roles", async () => {
    const inviteSnapshot = {
      exists: true,
      data: () => ({
        boardId,
        email: "invitee@example.com",
        role: "viewer",
      }),
    }
    const invitedBoardSnapshot = {
      exists: true,
      data: () => ({
        members: { owner: true },
        roles: { owner: "owner" },
      }),
    }
    const missingProfileSnapshot = { exists: false }

    mocks.getSession.mockResolvedValue({
      uid: "invitee",
      email: "invitee@example.com",
    })
    mocks.transaction.get.mockImplementation(async (reference: unknown) => {
      if (reference === mocks.inviteRef) return inviteSnapshot
      if (reference === mocks.boardRef) return invitedBoardSnapshot
      return missingProfileSnapshot
    })

    const response = await acceptInvite(
      jsonRequest(
        "https://example.test/api/invites/invite-1/accept",
        {
          boardId,
          displayName: "Invitee",
          email: "untrusted@example.com",
          photoURL: null,
        },
        "POST"
      ),
      { params: Promise.resolve({ inviteId: "invite-1" }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.boardRef,
      expect.objectContaining({
        members: { owner: true, invitee: true },
        roles: { owner: "owner", invitee: "viewer" },
      })
    )
    expect(mocks.transaction.set).toHaveBeenCalledWith(
      mocks.profileRef,
      expect.objectContaining({
        displayName: "Invitee",
        email: "invitee@example.com",
      })
    )
    expect(mocks.transaction.delete).toHaveBeenCalledWith(mocks.inviteRef)
  })
})
