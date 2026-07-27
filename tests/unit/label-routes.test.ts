// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const boardRef = { id: "board-1", collection: vi.fn(), get: vi.fn() }
  const labelRef = { id: "label-1", path: "labels/label-1" }
  const cardsQuery = { where: vi.fn(), limit: vi.fn(), get: vi.fn() }
  const transaction = {
    create: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  }
  const batch = { update: vi.fn(), commit: vi.fn() }
  return {
    batch,
    boardRef,
    cardsQuery,
    getSession: vi.fn(),
    labelRef,
    runTransaction: vi.fn(),
    transaction,
    verifyAppCheckToken: vi.fn(),
  }
})

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    batch: vi.fn(() => mocks.batch),
    collection: vi.fn(() => ({ doc: vi.fn(() => mocks.boardRef) })),
    runTransaction: mocks.runTransaction,
  },
}))

vi.mock("@/lib/firebase/app-check", () => ({
  verifyAppCheckToken: mocks.verifyAppCheckToken,
}))

vi.mock("@/lib/firebase/session", () => ({
  getSession: mocks.getSession,
}))

import { POST as createLabel } from "@/app/api/boards/[boardId]/labels/route"
import {
  DELETE as deleteLabel,
  PATCH as updateLabel,
} from "@/app/api/boards/[boardId]/labels/[labelId]/route"

const boardData = {
  members: { owner: true, editor: true, viewer: true },
  roles: { owner: "owner", editor: "editor", viewer: "viewer" },
  labelIds: {},
  labelNames: {},
}
const boardSnapshot = { exists: true, data: () => boardData }
const request = (method: string, body?: unknown) =>
  new Request("https://example.test/api/boards/board-1/labels", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

describe("label server routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAppCheckToken.mockResolvedValue({ ok: true })
    mocks.getSession.mockResolvedValue({
      uid: "owner",
      email: "owner@example.com",
    })
    mocks.boardRef.collection.mockImplementation((name: string) =>
      name === "cards"
        ? mocks.cardsQuery
        : { doc: vi.fn(() => mocks.labelRef) }
    )
    mocks.boardRef.get.mockResolvedValue(boardSnapshot)
    mocks.cardsQuery.where.mockReturnValue(mocks.cardsQuery)
    mocks.cardsQuery.limit.mockReturnValue(mocks.cardsQuery)
    mocks.cardsQuery.get.mockResolvedValue({ size: 0, empty: true, docs: [] })
    mocks.batch.commit.mockResolvedValue(undefined)
    mocks.runTransaction.mockImplementation(
      async (
        callback: (transaction: typeof mocks.transaction) => Promise<void>
      ) => callback(mocks.transaction)
    )
    mocks.transaction.get.mockImplementation(async (reference: unknown) =>
      reference === mocks.boardRef
        ? boardSnapshot
        : {
            exists: true,
            data: () => ({
              name: "Bug",
              normalizedName: "bug",
              color: "red",
            }),
            ref: mocks.labelRef,
          }
    )
  })

  it.each(["owner", "editor"])("allows a %s to create a label", async (uid) => {
    mocks.getSession.mockResolvedValue({ uid, email: `${uid}@example.com` })

    const response = await createLabel(
      request("POST", { name: "  Product   Bug ", color: "red" }),
      { params: Promise.resolve({ boardId: "board-1" }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.transaction.create).toHaveBeenCalledWith(
      mocks.labelRef,
      expect.objectContaining({
        name: "Product Bug",
        normalizedName: "product bug",
        color: "red",
      })
    )
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.boardRef,
      expect.objectContaining({
        labelIds: { "label-1": true },
        labelNames: { "product bug": "label-1" },
      })
    )
  })

  it("rejects viewer creation and invalid label data", async () => {
    mocks.getSession.mockResolvedValue({
      uid: "viewer",
      email: "viewer@example.com",
    })
    const forbidden = await createLabel(
      request("POST", { name: "Bug", color: "red" }),
      { params: Promise.resolve({ boardId: "board-1" }) }
    )
    const invalid = await createLabel(
      request("POST", { name: "", color: "#ff0000" }),
      { params: Promise.resolve({ boardId: "board-1" }) }
    )

    expect(forbidden.status).toBe(403)
    expect(invalid.status).toBe(400)
  })

  it("rejects a case-insensitive duplicate name", async () => {
    mocks.transaction.get.mockResolvedValue({
      exists: true,
      data: () => ({
        ...boardData,
        labelIds: { existing: true },
        labelNames: { bug: "existing" },
      }),
    })

    const response = await createLabel(
      request("POST", { name: "BUG", color: "blue" }),
      { params: Promise.resolve({ boardId: "board-1" }) }
    )

    expect(response.status).toBe(409)
    expect(mocks.transaction.create).not.toHaveBeenCalled()
  })

  it("rejects creation after the board reaches fifty labels", async () => {
    const labelIds = Object.fromEntries(
      Array.from({ length: 50 }, (_, index) => [`label-${index}`, true])
    )
    mocks.transaction.get.mockResolvedValue({
      exists: true,
      data: () => ({ ...boardData, labelIds }),
    })

    const response = await createLabel(
      request("POST", { name: "Overflow", color: "gray" }),
      { params: Promise.resolve({ boardId: "board-1" }) }
    )

    expect(response.status).toBe(409)
    expect(mocks.transaction.create).not.toHaveBeenCalled()
  })

  it("renames and recolors without rewriting cards", async () => {
    const response = await updateLabel(
      request("PATCH", { name: "Critical", color: "purple" }),
      {
        params: Promise.resolve({
          boardId: "board-1",
          labelId: "label-1",
        }),
      }
    )

    expect(response.status).toBe(200)
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.labelRef,
      expect.objectContaining({
        name: "Critical",
        normalizedName: "critical",
        color: "purple",
      })
    )
    expect(mocks.cardsQuery.get).not.toHaveBeenCalled()
  })

  it("cleans card references before deleting the catalog label", async () => {
    const cardRef = { path: "cards/card-1" }
    mocks.cardsQuery.get.mockResolvedValue({
      size: 1,
      empty: false,
      docs: [{ ref: cardRef }],
    })

    const response = await deleteLabel(request("DELETE"), {
      params: Promise.resolve({
        boardId: "board-1",
        labelId: "label-1",
      }),
    })

    expect(response.status).toBe(200)
    expect(mocks.batch.update).toHaveBeenCalledWith(
      cardRef,
      expect.objectContaining({ labelIds: expect.anything() })
    )
    expect(mocks.batch.commit).toHaveBeenCalledOnce()
    expect(mocks.transaction.delete).toHaveBeenCalledWith(mocks.labelRef)
  })

  it("rejects deletion when cleanup exceeds the card cap", async () => {
    mocks.cardsQuery.get.mockResolvedValue({
      size: 501,
      empty: false,
      docs: [],
    })

    const response = await deleteLabel(request("DELETE"), {
      params: Promise.resolve({
        boardId: "board-1",
        labelId: "label-1",
      }),
    })

    expect(response.status).toBe(409)
    expect(mocks.batch.commit).not.toHaveBeenCalled()
    expect(mocks.runTransaction).not.toHaveBeenCalled()
  })
})
