import { describe, expect, it } from "vitest"

// @ts-expect-error The smoke helpers are an executable JavaScript module.
import {
  createSmokeIdentity,
  isSafeSmokeUid,
} from "../../scripts/smoke-kanban-logic.mjs"

describe("kanban smoke safeguards", () => {
  it("creates unique, recognizable smoke identifiers", () => {
    expect(createSmokeIdentity(1234, "ABC-def_5678")).toEqual({
      uid: "smoke-1234-abcdef5678",
      boardTitle: "__kanban_smoke__ 1234-abcdef5678",
    })
  })

  it("accepts only explicitly synthetic user ids", () => {
    expect(isSafeSmokeUid("smoke-1234-abcdef")).toBe(true)
    expect(isSafeSmokeUid("production-user")).toBe(false)
    expect(isSafeSmokeUid("smoke-user@example.com")).toBe(false)
    expect(isSafeSmokeUid("real.firebase.uid")).toBe(false)
  })
})
