import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchWithAppCheck: vi.fn(),
  getIdToken: vi.fn(),
  replace: vi.fn(),
  setLocale: vi.fn(),
  user: {
    uid: "user-1",
    getIdToken: vi.fn(),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
}))

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}))

vi.mock("@/lib/firebase/client", () => ({
  clientAuth: {},
}))

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  fetchWithAppCheck: mocks.fetchWithAppCheck,
}))

vi.mock("@/lib/use-preferred-locale", () => ({
  usePreferredLocale: () => ({
    locale: "en",
    setLocale: mocks.setLocale,
  }),
}))

import SignInPage from "@/app/(auth)/sign-in/page"

describe("SignInPage session bootstrap", () => {
  beforeEach(() => {
    mocks.fetchWithAppCheck.mockReset()
    mocks.getIdToken.mockReset()
    mocks.replace.mockReset()
    mocks.user.getIdToken = mocks.getIdToken
    mocks.getIdToken.mockResolvedValue("firebase-id-token")
    mocks.fetchWithAppCheck.mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    )
  })

  afterEach(cleanup)

  it("creates one server session per signed-in user", async () => {
    const view = render(<SignInPage />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/")
    })

    view.rerender(<SignInPage />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })

    expect(mocks.getIdToken).toHaveBeenCalledOnce()
    expect(mocks.fetchWithAppCheck).toHaveBeenCalledOnce()
    expect(mocks.fetchWithAppCheck).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "POST" })
    )
  })
})
