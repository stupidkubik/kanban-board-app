import { afterEach, describe, expect, it, vi } from "vitest"

import { reportClientError } from "@/lib/client/report-error"

describe("reportClientError", () => {
  afterEach(() => vi.restoreAllMocks())

  it("logs a structured event and preserves the server digest", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const error = Object.assign(new Error("render failed"), { digest: "digest-123" })

    expect(reportClientError(error, { boundary: "route" })).toBe("digest-123")
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "client_render_error",
        correlationId: "digest-123",
        boundary: "route",
        message: "render failed",
      }),
    )
  })
})
