// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const boardRef = {
    kind: "board",
    collection: vi.fn(),
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
    runTransaction: mocks.runTransaction,
  },
}))

vi.mock("@/lib/firebase/app-check", () => ({
  verifyAppCheckToken: mocks.verifyAppCheckToken,
}))

vi.mock("@/lib/firebase/session", () => ({
  getSession: mocks.getSession,
}))

import { DELETE as deleteMember } from "@/app/api/boards/[boardId]/members/[memberId]/route"
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

    mocks.verifyAppCheckToken.mockResolvedValue({ ok: true })
    mocks.boardRef.collection.mockReturnValue({
      doc: vi.fn(() => mocks.profileRef),
    })
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
