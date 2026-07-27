import { describe, expect, it } from "vitest"

// @ts-expect-error The migration helpers are an executable JavaScript module.
import {
  MAX_BATCH_WRITES,
  chunkValues,
  findStaleProfileIds,
} from "../../scripts/stale-member-profiles-logic.mjs"

describe("stale member profile migration", () => {
  it("keeps current members and removes only absent profile ids", () => {
    expect(
      findStaleProfileIds({
        members: { owner: true, editor: true, viewer: false },
        ownerId: "owner",
        profileIds: ["stale-b", "editor", "stale-a", "owner", "viewer"],
      })
    ).toEqual(["stale-a", "stale-b"])
  })

  it("protects the owner when legacy membership data is malformed", () => {
    expect(
      findStaleProfileIds({
        members: null,
        ownerId: "owner",
        profileIds: ["stale", "owner"],
      })
    ).toEqual(["stale"])
  })

  it("deduplicates ids and splits writes at the Firestore batch limit", () => {
    const staleIds = findStaleProfileIds({
      members: {},
      ownerId: "",
      profileIds: ["stale", "stale"],
    })
    const profileIds = Array.from(
      { length: MAX_BATCH_WRITES + 1 },
      (_, index) => `profile-${index}`
    )

    expect(staleIds).toEqual(["stale"])
    expect(chunkValues(profileIds).map((chunk: string[]) => chunk.length)).toEqual([
      MAX_BATCH_WRITES,
      1,
    ])
  })

  it("rejects unsafe batch sizes", () => {
    expect(() => chunkValues(["profile"], 0)).toThrow()
    expect(() => chunkValues(["profile"], MAX_BATCH_WRITES + 1)).toThrow()
  })
})
