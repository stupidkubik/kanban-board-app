import { describe, expect, it } from "vitest"

import { getColumnDropId, getColumnIdFromDropId } from "@/lib/board-dnd"

describe("board-dnd helpers", () => {
  it("builds and parses column drop ids", () => {
    const dropId = getColumnDropId("column-1")
    expect(dropId).toBe("column:column-1")
    expect(getColumnIdFromDropId(dropId)).toBe("column-1")
    expect(getColumnIdFromDropId("card:123")).toBeNull()
  })
})
