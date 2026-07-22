import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  appCheck: { name: "test-app-check" },
  getToken: vi.fn(),
}))

vi.mock("@/lib/firebase/client", () => ({
  clientAppCheck: mocks.appCheck,
}))

vi.mock("firebase/app-check", () => ({
  getToken: mocks.getToken,
}))

import { fetchWithAppCheck } from "@/lib/firebase/app-check-fetch"

describe("fetchWithAppCheck", () => {
  beforeEach(() => {
    mocks.getToken.mockReset()
    vi.restoreAllMocks()
  })

  it("adds a Firebase App Check token and preserves request headers", async () => {
    mocks.getToken.mockResolvedValue({ token: "app-check-token" })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }))

    await fetchWithAppCheck("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    expect(mocks.getToken).toHaveBeenCalledWith(mocks.appCheck, false)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(headers.get("X-Firebase-AppCheck")).toBe("app-check-token")
  })
})
