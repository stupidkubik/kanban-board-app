// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const jar = new Map<string, string>()
  return {
    jar,
    cookieStore: {
      get: vi.fn((name: string) =>
        jar.has(name) ? { name, value: jar.get(name)! } : undefined
      ),
      set: vi.fn((name: string, value: string) => {
        if (value) jar.set(name, value)
        else jar.delete(name)
      }),
    },
    createSessionCookie: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    verifySessionCookie: vi.fn(),
  }
})

vi.mock("server-only", () => ({}))

vi.mock("next/headers", () => ({
  cookies: async () => mocks.cookieStore,
}))

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    createSessionCookie: mocks.createSessionCookie,
    revokeRefreshTokens: mocks.revokeRefreshTokens,
    verifySessionCookie: mocks.verifySessionCookie,
  },
}))

vi.mock("@/lib/firebase/app-check", () => ({
  verifyAppCheckToken: vi.fn(async () => ({ ok: true })),
}))

import { DELETE, POST } from "@/app/api/auth/session/route"
import { getSession } from "@/lib/firebase/session"
import { isCrossOriginMutation } from "@/lib/server/same-origin"

const postToken = (body: unknown) =>
  POST(
    new Request("https://kanban.test/api/auth/session", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "x-forwarded-for": `198.51.100.${Math.random() * 200}` },
    })
  )

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.jar.clear()
  })

  it("returns 401 instead of 500 for a token Firebase rejects", async () => {
    mocks.createSessionCookie.mockRejectedValue(
      Object.assign(new Error("Decoding Firebase ID token failed"), {
        code: "auth/argument-error",
      })
    )

    const response = await postToken({ idToken: "not-a-jwt" })

    expect(response.status).toBe(401)
    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
  })

  it.each([[{ idToken: 42 }], [{ idToken: "" }], [{}], [null]])(
    "rejects a missing or non-string idToken: %j",
    async (body) => {
      const response = await postToken(body)

      expect(response.status).toBe(400)
      expect(mocks.createSessionCookie).not.toHaveBeenCalled()
    }
  )

  it("sets the session cookie for a valid token", async () => {
    mocks.createSessionCookie.mockResolvedValue("session-cookie-value")

    const response = await postToken({ idToken: "valid-id-token" })

    expect(response.status).toBe(200)
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "session",
      "session-cookie-value",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" })
    )
  })

  it("revokes refresh tokens on sign-out before clearing the cookie", async () => {
    mocks.jar.set("session", "session-cookie-value")
    mocks.verifySessionCookie.mockResolvedValue({ uid: "user-1" })

    const response = await DELETE(
      new Request("https://kanban.test/api/auth/session", { method: "DELETE" })
    )

    expect(response.status).toBe(200)
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith("user-1")
    expect(mocks.jar.has("session")).toBe(false)
  })

  it("does not revoke sessions with an already revoked cookie", async () => {
    mocks.jar.set("session", "stolen-revoked-cookie")
    mocks.verifySessionCookie.mockImplementation(
      async (_cookie: string, checkRevoked?: boolean) => {
        if (checkRevoked) throw new Error("auth/session-cookie-revoked")
        return { uid: "user-1" }
      }
    )

    const response = await DELETE(
      new Request("https://kanban.test/api/auth/session", { method: "DELETE" })
    )

    expect(response.status).toBe(200)
    expect(mocks.revokeRefreshTokens).not.toHaveBeenCalled()
  })

  it("still clears the cookie when it can no longer be verified", async () => {
    mocks.jar.set("session", "expired")
    mocks.verifySessionCookie.mockRejectedValue(new Error("expired"))

    const response = await DELETE(
      new Request("https://kanban.test/api/auth/session", { method: "DELETE" })
    )

    expect(response.status).toBe(200)
    expect(mocks.revokeRefreshTokens).not.toHaveBeenCalled()
    expect(mocks.jar.has("session")).toBe(false)
  })

  it("uses a Secure __Host- cookie in production and still reads the legacy one", async () => {
    vi.stubEnv("NODE_ENV", "production")
    try {
      mocks.createSessionCookie.mockResolvedValue("new-cookie")
      await postToken({ idToken: "valid-id-token" })
      expect(mocks.cookieStore.set).toHaveBeenCalledWith(
        "__Host-session",
        "new-cookie",
        expect.objectContaining({ secure: true, path: "/" })
      )

      mocks.jar.clear()
      mocks.jar.set("session", "legacy-cookie")
      mocks.verifySessionCookie.mockResolvedValue({ uid: "user-1" })
      await expect(getSession()).resolves.toEqual({ uid: "user-1" })
      expect(mocks.verifySessionCookie).toHaveBeenCalledWith(
        "legacy-cookie",
        true
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("verifies sessions with the revocation check", async () => {
    mocks.jar.set("session", "session-cookie-value")
    mocks.verifySessionCookie.mockResolvedValue({ uid: "user-1" })

    await expect(getSession()).resolves.toEqual({ uid: "user-1" })
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith(
      "session-cookie-value",
      true
    )
  })
})

describe("isCrossOriginMutation", () => {
  const request = (method: string, headers: Record<string, string>) =>
    new Request("https://kanban.test/api/boards", { method, headers })

  it("allows same-origin and header-less mutations and all reads", () => {
    expect(
      isCrossOriginMutation(
        request("POST", {
          origin: "https://kanban.test",
          "sec-fetch-site": "same-origin",
        })
      )
    ).toBe(false)
    expect(isCrossOriginMutation(request("DELETE", {}))).toBe(false)
    expect(
      isCrossOriginMutation(
        request("GET", {
          origin: "https://evil.test",
          "sec-fetch-site": "cross-site",
        })
      )
    ).toBe(false)
  })

  it("compares Origin with the host the browser addressed", () => {
    // next dev builds request.url from --hostname, not from the Host header.
    const devRequest = new Request("http://localhost:3100/api/auth/session", {
      method: "POST",
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
    })
    const vercelRequest = new Request("https://internal.vercel/api/boards", {
      method: "POST",
      headers: {
        host: "internal.vercel",
        "x-forwarded-host": "kanban.test",
        origin: "https://kanban.test",
      },
    })

    expect(isCrossOriginMutation(devRequest)).toBe(false)
    expect(isCrossOriginMutation(vercelRequest)).toBe(false)
  })

  it.each([
    [{ "sec-fetch-site": "cross-site" }],
    [{ "sec-fetch-site": "same-site" }],
    [{ origin: "https://evil.test" }],
    [{ origin: "https://kanban.test.evil.test" }],
    [{ origin: "null" }],
  ])("rejects a cross-origin mutation: %j", (headers) => {
    expect(isCrossOriginMutation(request("POST", headers))).toBe(true)
    expect(isCrossOriginMutation(request("PATCH", headers))).toBe(true)
  })
})
