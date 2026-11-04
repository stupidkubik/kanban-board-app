// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const profileRef = { kind: "profile" }
  const boardRef = {
    kind: "board",
    collection: vi.fn(() => ({ doc: vi.fn(() => profileRef) })),
  }
  const inviteRef = { kind: "invite" }
  const transaction = {
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  }

  return {
    boardRef,
    getSession: vi.fn(),
    getUser: vi.fn(),
    inviteRef,
    profileRef,
    runTransaction: vi.fn(),
    transaction,
    verifyAppCheckToken: vi.fn(),
  }
})

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: { getUser: mocks.getUser },
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

import { POST } from "@/app/api/invites/[inviteId]/accept/route"

const INVITE_EMAIL = "invitee@example.com"
const BOARD_ID = "board-1"
const INVITE_ID = `${BOARD_ID}__${INVITE_EMAIL}`

const snapshot = (data: Record<string, unknown> | undefined) => ({
  exists: data !== undefined,
  data: () => data,
})

const accept = (body: Record<string, unknown> = { boardId: BOARD_ID }) =>
  POST(
    new Request(`http://localhost/api/invites/${INVITE_ID}/accept`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ inviteId: INVITE_ID }) }
  )

describe("POST /api/invites/[inviteId]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAppCheckToken.mockResolvedValue({ ok: true })
    // Claims from the session cookie: frozen at sign-in, before verification.
    mocks.getSession.mockResolvedValue({
      uid: "invitee",
      email: INVITE_EMAIL,
      email_verified: false,
    })
    mocks.getUser.mockResolvedValue({
      uid: "invitee",
      email: INVITE_EMAIL,
      emailVerified: true,
    })
    mocks.transaction.get.mockImplementation(async (ref: { kind: string }) => {
      if (ref.kind === "invite") {
        return snapshot({
          boardId: BOARD_ID,
          email: INVITE_EMAIL,
          role: "editor",
        })
      }
      if (ref.kind === "board") {
        return snapshot({
          members: { owner: true },
          roles: { owner: "owner" },
        })
      }
      return snapshot(undefined)
    })
    mocks.runTransaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => unknown) =>
        callback(mocks.transaction)
    )
  })

  it("rejects an account whose email is not verified", async () => {
    mocks.getUser.mockResolvedValue({
      uid: "invitee",
      email: INVITE_EMAIL,
      emailVerified: false,
    })

    const response = await accept()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "email-not-verified",
    })
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it("rejects an account without an email", async () => {
    mocks.getUser.mockResolvedValue({ uid: "invitee", emailVerified: true })

    const response = await accept()

    expect(response.status).toBe(403)
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it("rejects a verified account with a different email", async () => {
    mocks.getUser.mockResolvedValue({
      uid: "invitee",
      email: "someone-else@example.com",
      emailVerified: true,
    })

    const response = await accept()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: "Invite email mismatch",
    })
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })

  it("returns 401 when the account no longer exists", async () => {
    mocks.getUser.mockRejectedValue(new Error("auth/user-not-found"))

    const response = await accept()

    expect(response.status).toBe(401)
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it("accepts once the live account is verified and ignores a body email", async () => {
    const response = await accept({
      boardId: BOARD_ID,
      displayName: "Invitee",
      email: "spoofed@example.com",
    })

    expect(response.status).toBe(200)
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.boardRef,
      expect.objectContaining({
        members: { owner: true, invitee: true },
        roles: { owner: "owner", invitee: "editor" },
      })
    )
    expect(mocks.transaction.set).toHaveBeenCalledWith(
      mocks.profileRef,
      expect.objectContaining({ email: INVITE_EMAIL })
    )
    expect(mocks.transaction.delete).toHaveBeenCalledWith(mocks.inviteRef)
  })
})
