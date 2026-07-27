import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authListener: null as null | ((user: unknown) => void),
  refreshServerSession: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  onIdTokenChanged: vi.fn(
    (
      _auth: unknown,
      listener: (user: unknown) => void
    ) => {
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
  const { user, loading } = useAuth()
  return <div>{loading ? "loading" : user?.uid ?? "signed-out"}</div>
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authListener = null
    mocks.refreshServerSession.mockResolvedValue(undefined)
  })

  afterEach(cleanup)

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
})
