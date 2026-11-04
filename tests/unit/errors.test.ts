// @vitest-environment node
import { FirebaseError } from "firebase/app"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ApiError,
  getErrorCode,
  getErrorMessage,
  readApiError,
  serializeError,
} from "@/lib/errors"
import { internalErrorResponse } from "@/lib/server/error-response"

const rawFirestoreMessage =
  "5 NOT_FOUND: projects/demo/databases/(default)/documents/boards/b1"

describe("client error helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the localized fallback instead of a raw SDK message", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const error = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions."
    )

    expect(getErrorMessage(error, "Не удалось сохранить.")).toBe(
      "Не удалось сохранить."
    )
    expect(warn).toHaveBeenCalledWith(
      "[kanban]",
      "Не удалось сохранить.",
      error
    )
  })

  it("serializes errors for the RTK store and keeps code and status", () => {
    const serialized = serializeError(
      new ApiError(409, "COLUMN_NOT_EMPTY", "Column is not empty"),
      "Delete column failed"
    )

    expect(serialized).toEqual({
      name: "ApiError",
      message: "Column is not empty",
      code: "COLUMN_NOT_EMPTY",
      status: 409,
    })
    expect(Object.getPrototypeOf(serialized)).toBe(Object.prototype)
    expect(getErrorCode(serialized)).toBe("COLUMN_NOT_EMPTY")
  })

  it("reads the server code from a failed response", async () => {
    const error = await readApiError(
      Response.json(
        { error: "Email not verified", code: "email-not-verified" },
        { status: 403 }
      ),
      "Accept invite failed"
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(403)
    expect(error.code).toBe("email-not-verified")
  })

  it("falls back when the response is not JSON", async () => {
    const error = await readApiError(
      new Response("<html>", { status: 502 }),
      "Delete board failed"
    )

    expect(error.message).toBe("Delete board failed")
    expect(error.code).toBeUndefined()
  })
})

describe("internalErrorResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("logs the raw error under an id and returns only the fallback", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = internalErrorResponse(
      Object.assign(new Error(rawFirestoreMessage), { code: 5 }),
      "Create board failed"
    )
    const body = (await response.json()) as { error: string; errorId: string }

    expect(response.status).toBe(500)
    expect(body.error).toBe("Create board failed")
    expect(JSON.stringify(body)).not.toContain("projects/")
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "api_error",
        errorId: body.errorId,
        code: 5,
        message: rawFirestoreMessage,
      })
    )
  })
})
