// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  isDocumentId,
  isInviteId,
  parseBoardTitle,
  parseProfileFields,
} from "@/lib/server/route-input"

const mocks = vi.hoisted(() => {
  const transaction = {
    create: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  }
  const profileRef = { kind: "profile" }
  const boardRef = {
    kind: "board",
    collection: vi.fn(() => ({ doc: vi.fn(() => profileRef) })),
    get: vi.fn(),
  }
  return {
    boardRef,
    getSession: vi.fn(),
    getUser: vi.fn(),
    inviteRef: { kind: "invite" },
    profileRef,
    runTransaction: vi.fn(),
    transaction,
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
  verifyAppCheckToken: vi.fn(async () => ({ ok: true })),
}))

vi.mock("@/lib/firebase/session", () => ({
  getSession: mocks.getSession,
}))

import { POST as createBoard } from "@/app/api/boards/route"
import {
  GET as getBoard,
  PATCH as renameBoard,
} from "@/app/api/boards/[boardId]/route"
import { DELETE as deleteColumn } from "@/app/api/boards/[boardId]/columns/[columnId]/route"
import { POST as createLabel } from "@/app/api/boards/[boardId]/labels/route"
import { DELETE as removeMember } from "@/app/api/boards/[boardId]/members/[memberId]/route"
import { POST as acceptInvite } from "@/app/api/invites/[inviteId]/accept/route"

const post = (body: unknown, method = "POST") =>
  new Request("https://example.test/api", {
    method,
    body: JSON.stringify(body),
  })

const validBoard = {
  boardId: "AbC123def456GHI789jk",
  title: "Roadmap",
  language: "en",
  displayName: "Owner",
  email: "owner@example.com",
  photoURL: "https://lh3.googleusercontent.com/a/photo",
}

describe("route input helpers", () => {
  it("accepts generated ids and rejects path-changing ones", () => {
    expect(isDocumentId("AbC123def456GHI789jk")).toBe(true)
    expect(isDocumentId("legacy_0123456789abcdef0123")).toBe(true)
    for (const value of ["", "a/b", "..", "a b", "x".repeat(129), 42, null]) {
      expect(isDocumentId(value)).toBe(false)
    }
  })

  it("accepts the board__email invite id shape only", () => {
    expect(isInviteId("board-1__invitee@example.com")).toBe(true)
    for (const value of [
      "invite-1",
      "board-1__no-at-sign",
      "board-1/x__a@b.c",
      `board-1__${"a".repeat(600)}@b.c`,
    ]) {
      expect(isInviteId(value)).toBe(false)
    }
  })

  it("trims titles and enforces 1..120 characters", () => {
    expect(parseBoardTitle("  Board  ")).toBe("Board")
    expect(parseBoardTitle("x".repeat(120))).toHaveLength(120)
    expect(parseBoardTitle("x".repeat(121))).toBeNull()
    expect(parseBoardTitle("   ")).toBeNull()
    expect(parseBoardTitle({ title: "x" })).toBeNull()
  })

  it("accepts string-or-null profile fields within limits", () => {
    expect(parseProfileFields({})).toEqual({
      displayName: null,
      photoURL: null,
    })
    expect(parseProfileFields({ displayName: { a: 1 } })).toBeNull()
    expect(parseProfileFields({ displayName: "x".repeat(121) })).toBeNull()
    expect(parseProfileFields({ photoURL: "http://example.com/a" })).toBeNull()
    expect(
      parseProfileFields({ photoURL: `https://e.com/${"a".repeat(2048)}` })
    ).toBeNull()
  })
})

describe("routes reject malformed input before touching Firestore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({
      uid: "owner-1",
      email: "owner@example.com",
    })
    mocks.runTransaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => unknown) =>
        callback(mocks.transaction)
    )
  })

  it.each([
    ["a path-changing boardId", { ...validBoard, boardId: "boards/other" }],
    ["a 121-character title", { ...validBoard, title: "x".repeat(121) }],
    ["an object displayName", { ...validBoard, displayName: { big: "x" } }],
    ["a non-https photoURL", { ...validBoard, photoURL: "javascript:x" }],
    ["an unknown field", { ...validBoard, members: { attacker: true } }],
    ["an array body", [validBoard]],
  ])("POST /api/boards rejects %s", async (_label, body) => {
    const response = await createBoard(post(body))

    expect(response.status).toBe(400)
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })

  it("POST /api/boards creates a board from valid input", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: false })

    const response = await createBoard(post(validBoard))

    expect(response.status).toBe(200)
    expect(mocks.transaction.create).toHaveBeenCalledWith(
      mocks.profileRef,
      expect.objectContaining({
        displayName: "Owner",
        email: "owner@example.com",
        photoURL: validBoard.photoURL,
      })
    )
  })

  it("rejects a path-changing boardId on board, column, label and member routes", async () => {
    const boardId = "a/b"
    const responses = await Promise.all([
      getBoard(new Request("https://example.test/api"), {
        params: Promise.resolve({ boardId }),
      }),
      renameBoard(post({ title: "Ok" }, "PATCH"), {
        params: Promise.resolve({ boardId }),
      }),
      deleteColumn(new Request("https://example.test/api"), {
        params: Promise.resolve({ boardId, columnId: "column-1" }),
      }),
      createLabel(post({ name: "Bug", color: "red" }), {
        params: Promise.resolve({ boardId }),
      }),
      removeMember(new Request("https://example.test/api"), {
        params: Promise.resolve({ boardId, memberId: "member-1" }),
      }),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400, 400, 400,
    ])
    expect(mocks.runTransaction).not.toHaveBeenCalled()
    expect(mocks.boardRef.get).not.toHaveBeenCalled()
  })

  it("PATCH /api/boards/[boardId] rejects a title over 120 characters", async () => {
    const response = await renameBoard(
      post({ title: "x".repeat(121) }, "PATCH"),
      { params: Promise.resolve({ boardId: "board-1" }) }
    )

    expect(response.status).toBe(400)
  })

  it("accept rejects a malformed invite id and oversized profile fields", async () => {
    const malformedId = await acceptInvite(post({ boardId: "board-1" }), {
      params: Promise.resolve({ inviteId: "board-1" }),
    })
    const oversizedPhoto = await acceptInvite(
      post({
        boardId: "board-1",
        photoURL: `https://e.com/${"a".repeat(2048)}`,
      }),
      { params: Promise.resolve({ inviteId: "board-1__owner@example.com" }) }
    )

    expect(malformedId.status).toBe(400)
    expect(oversizedPhoto.status).toBe(400)
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it("accept refuses a board that already has 100 members", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "invitee",
      email: "invitee@example.com",
    })
    mocks.getUser.mockResolvedValue({
      email: "invitee@example.com",
      emailVerified: true,
    })
    const members = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [`member-${index}`, true])
    )
    mocks.transaction.get.mockImplementation(async (ref: { kind: string }) => {
      if (ref.kind === "invite") {
        return {
          exists: true,
          data: () => ({
            boardId: "board-1",
            email: "invitee@example.com",
            role: "viewer",
          }),
        }
      }
      if (ref.kind === "board") {
        return { exists: true, data: () => ({ members, roles: {} }) }
      }
      return { exists: false, data: () => undefined }
    })

    const response = await acceptInvite(post({ boardId: "board-1" }), {
      params: Promise.resolve({ inviteId: "board-1__invitee@example.com" }),
    })

    expect(response.status).toBe(409)
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })
})
