import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  appCheck: { name: "test-app-check" },
  currentUser: null as null | { getIdToken: ReturnType<typeof vi.fn> },
  getToken: vi.fn(),
}))

vi.mock("@/lib/firebase/client", () => ({
  clientAppCheck: mocks.appCheck,
  clientAuth: {
    get currentUser() {
      return mocks.currentUser
    },
  },
}))

vi.mock("firebase/app-check", () => ({
  getToken: mocks.getToken,
}))

import {
  fetchWithAppCheck,
  refreshServerSession,
} from "@/lib/firebase/app-check-fetch"

describe("fetchWithAppCheck", () => {
  beforeEach(() => {
    mocks.getToken.mockReset()
    mocks.currentUser = null
    window.localStorage.clear()
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

  it("refreshes an expired server session and retries one unauthorized request", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh-id-token")
    mocks.currentUser = { uid: "user-1", getIdToken } as never
    mocks.getToken.mockResolvedValue({ token: "app-check-token" })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await fetchWithAppCheck("/api/boards/board-1/labels", {
      method: "POST",
    })

    expect(response.status).toBe(204)
    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/session")
  })

  it("coalesces concurrent server session refreshes", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh-id-token")
    mocks.currentUser = { uid: "user-1", getIdToken } as never
    mocks.getToken.mockResolvedValue({ token: "app-check-token" })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }))

    await Promise.all([refreshServerSession(), refreshServerSession()])

    expect(getIdToken).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("reuses a recently synchronized session across page mounts", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh-id-token")
    mocks.currentUser = { uid: "user-1", getIdToken } as never
    mocks.getToken.mockResolvedValue({ token: "app-check-token" })
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }))

    await refreshServerSession()
    await refreshServerSession()

    expect(getIdToken).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
