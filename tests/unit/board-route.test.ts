// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const emptyQuery = {
    get: vi.fn(),
    limit: vi.fn(),
  }
  const boardRef = {
    collection: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  }
  const invitesQuery = {
    limit: vi.fn(),
  }

  return {
    boardRef,
    emptyQuery,
    getSession: vi.fn(),
    invitesQuery,
    verifyAppCheckToken: vi.fn(),
  }
})

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === "boards") {
        return { doc: vi.fn(() => mocks.boardRef) }
      }
      return {
        where: vi.fn(() => mocks.invitesQuery),
      }
    }),
  },
}))

vi.mock("@/lib/firebase/app-check", () => ({
  verifyAppCheckToken: mocks.verifyAppCheckToken,
}))

vi.mock("@/lib/firebase/session", () => ({
  getSession: mocks.getSession,
}))

import { DELETE } from "@/app/api/boards/[boardId]/route"

const boardId = "board-1"
const request = () =>
  new Request(`https://example.test/api/boards/${boardId}`, {
    method: "DELETE",
  })

describe("board delete route authorization", () => {
  beforeEach(() => {
    mocks.boardRef.collection.mockReset()
    mocks.boardRef.delete.mockReset()
    mocks.boardRef.get.mockReset()
    mocks.emptyQuery.get.mockReset()
    mocks.emptyQuery.limit.mockReset()
    mocks.getSession.mockReset()
    mocks.invitesQuery.limit.mockReset()
    mocks.verifyAppCheckToken.mockReset()

    mocks.verifyAppCheckToken.mockResolvedValue({ ok: true })
    mocks.emptyQuery.limit.mockReturnValue(mocks.emptyQuery)
    mocks.emptyQuery.get.mockResolvedValue({ empty: true, docs: [] })
    mocks.boardRef.collection.mockReturnValue(mocks.emptyQuery)
    mocks.invitesQuery.limit.mockReturnValue(mocks.emptyQuery)
  })

  it("returns 401 before reading a board without a session", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await DELETE(request(), {
      params: Promise.resolve({ boardId }),
    })

    expect(response.status).toBe(401)
    expect(mocks.boardRef.get).not.toHaveBeenCalled()
  })

  it("returns 403 without deleting data for a non-owner member", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "editor",
      email: "editor@example.com",
    })
    mocks.boardRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: "owner" }),
    })

    const response = await DELETE(request(), {
      params: Promise.resolve({ boardId }),
    })

    expect(response.status).toBe(403)
    expect(mocks.emptyQuery.get).not.toHaveBeenCalled()
    expect(mocks.boardRef.delete).not.toHaveBeenCalled()
  })

  it("allows the owner to delete an empty board and its subcollections", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.boardRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: "owner" }),
    })

    const response = await DELETE(request(), {
      params: Promise.resolve({ boardId }),
    })

    expect(response.status).toBe(200)
    expect(mocks.boardRef.collection).toHaveBeenCalledWith("columns")
    expect(mocks.boardRef.collection).toHaveBeenCalledWith("cards")
    expect(mocks.boardRef.collection).toHaveBeenCalledWith("memberProfiles")
    expect(mocks.boardRef.collection).toHaveBeenCalledWith("labels")
    expect(mocks.emptyQuery.get).toHaveBeenCalledTimes(5)
    expect(mocks.boardRef.delete).toHaveBeenCalledOnce()
  })
})
