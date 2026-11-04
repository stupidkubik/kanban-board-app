import { act, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authListener: null as null | ((user: unknown) => void),
  refreshServerSession: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  onIdTokenChanged: vi.fn(
    (_auth: unknown, listener: (user: unknown) => void) => {
      mocks.authListener = listener
      return mocks.unsubscribe
    }
  ),
}))

vi.mock("@/lib/firebase/client", () => ({
  clientAuth: { name: "test-auth" },
}))

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  refreshServerSession: mocks.refreshServerSession,
}))

import { AuthProvider, useAuth } from "@/components/auth-provider"
import { store } from "@/lib/store"

const AuthProbe = () => {
  const { user, loading, emailVerified } = useAuth()
  return (
    <div>
      <span>{loading ? "loading" : (user?.uid ?? "signed-out")}</span>
      <span>{emailVerified ? "verified" : "unverified"}</span>
    </div>
  )
}

const tokenWith = (emailVerified: boolean) =>
  Promise.resolve({ claims: { email_verified: emailVerified } })

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authListener = null
    mocks.refreshServerSession.mockResolvedValue(undefined)
  })

  it("tracks token refresh events and renews the server session", async () => {
    const view = render(
      <Provider store={store}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </Provider>
    )

    expect(screen.getByText("loading")).toBeInTheDocument()
    const user = {
      uid: "user-1",
      displayName: "User",
      photoURL: null,
      email: "user@example.com",
      getIdTokenResult: () => tokenWith(true),
    }
    await act(async () => {
      mocks.authListener?.(user)
    })

    expect(screen.getByText("user-1")).toBeInTheDocument()
    await waitFor(() =>
      expect(mocks.refreshServerSession).toHaveBeenCalledOnce()
    )

    view.unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it("publishes email verification from the ID token, not the reloaded user", async () => {
    render(
      <Provider store={store}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </Provider>
    )
    const user = {
      uid: "user-1",
      email: "user@example.com",
      // user.reload() already flipped the flag; the cached token has not.
      emailVerified: true,
      getIdTokenResult: vi.fn(() => tokenWith(false)),
    }

    await act(async () => {
      mocks.authListener?.(user)
    })
    expect(screen.getByText("unverified")).toBeInTheDocument()

    // getIdToken(true) fires the listener again with the refreshed token.
    user.getIdTokenResult.mockImplementation(() => tokenWith(true))
    await act(async () => {
      mocks.authListener?.(user)
    })
    expect(screen.getByText("verified")).toBeInTheDocument()
  })

  it("ignores claims that resolve after a newer token event", async () => {
    render(
      <Provider store={store}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </Provider>
    )
    let resolveStale: (value: unknown) => void = () => {}
    const stale = {
      uid: "user-1",
      getIdTokenResult: () =>
        new Promise((resolve) => (resolveStale = resolve)),
    }
    const fresh = { uid: "user-1", getIdTokenResult: () => tokenWith(true) }

    await act(async () => {
      mocks.authListener?.(stale)
      mocks.authListener?.(fresh)
    })
    await act(async () => {
      resolveStale({ claims: { email_verified: false } })
    })

    expect(screen.getByText("verified")).toBeInTheDocument()
  })
})
