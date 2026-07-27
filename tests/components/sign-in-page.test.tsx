import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FirebaseError } from "firebase/app"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as { uid: string; getIdToken: ReturnType<typeof vi.fn> } | null,
    loading: false,
  },
  locale: "en" as "ru" | "en",
  createUser: vi.fn(),
  getIdToken: vi.fn(),
  refreshServerSession: vi.fn(),
  replace: vi.fn(),
  resetPassword: vi.fn(),
  setLocale: vi.fn(),
  signInEmail: vi.fn(),
  signInPopup: vi.fn(),
  signInRedirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  createUserWithEmailAndPassword: mocks.createUser,
  sendPasswordResetEmail: mocks.resetPassword,
  signInWithEmailAndPassword: mocks.signInEmail,
  signInWithPopup: mocks.signInPopup,
  signInWithRedirect: mocks.signInRedirect,
}))

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => mocks.authState,
}))

vi.mock("@/lib/firebase/client", () => ({
  clientAuth: {},
}))

vi.mock("@/lib/firebase/app-check-fetch", () => ({
  refreshServerSession: mocks.refreshServerSession,
}))

vi.mock("@/lib/use-preferred-locale", () => ({
  usePreferredLocale: () => ({
    locale: mocks.locale,
    setLocale: mocks.setLocale,
  }),
}))

import SignInPage from "@/app/(auth)/sign-in/page"

const submitEmailForm = () => {
  const emailInput = screen.getByLabelText("Email")
  const form = emailInput.closest("form")
  if (!form) {
    throw new Error("Email form not found")
  }
  fireEvent.submit(form)
}

describe("SignInPage", () => {
  beforeEach(() => {
    mocks.authState.user = null
    mocks.authState.loading = false
    mocks.locale = "en"
    vi.clearAllMocks()
    mocks.createUser.mockResolvedValue({})
    mocks.refreshServerSession.mockResolvedValue(undefined)
    mocks.getIdToken.mockResolvedValue("firebase-id-token")
    mocks.resetPassword.mockResolvedValue(undefined)
    mocks.signInEmail.mockResolvedValue({})
    mocks.signInPopup.mockResolvedValue({})
    mocks.signInRedirect.mockResolvedValue(undefined)
  })

  afterEach(cleanup)

  it("validates invalid email and password before calling Firebase", async () => {
    const user = userEvent.setup()
    render(<SignInPage />)

    await user.type(screen.getByLabelText("Email"), "invalid")
    submitEmailForm()
    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument()

    await user.clear(screen.getByLabelText("Email"))
    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.type(screen.getByLabelText("Password"), "123")
    submitEmailForm()
    expect(
      await screen.findByText("Password must be at least 6 characters.")
    ).toBeInTheDocument()
    expect(mocks.signInEmail).not.toHaveBeenCalled()
  })

  it("toggles between sign-in and sign-up and dispatches the selected flow", async () => {
    const user = userEvent.setup()
    render(<SignInPage />)

    await user.click(screen.getByRole("button", { name: "No account? Sign up" }))
    expect(
      screen.getByRole("button", { name: "Create account" })
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.type(screen.getByLabelText("Password"), "secret1")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() => {
      expect(mocks.createUser).toHaveBeenCalledWith(
        {},
        "user@example.com",
        "secret1"
      )
    })
  })

  it("sends a password reset email and returns to sign-in", async () => {
    const user = userEvent.setup()
    render(<SignInPage />)

    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.click(screen.getByRole("button", { name: "Forgot password?" }))
    await user.click(screen.getByRole("button", { name: "Send reset email" }))

    await waitFor(() => {
      expect(mocks.resetPassword).toHaveBeenCalledWith({}, "user@example.com")
    })
    expect(
      screen.getByText("Password reset email sent.")
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Back to sign in" }))
    expect(screen.getByRole("heading", { name: "Sign in to Kanban" }))
      .toBeInTheDocument()
  })

  it("falls back from a blocked Google popup to redirect", async () => {
    const user = userEvent.setup()
    mocks.signInPopup.mockRejectedValue(
      new FirebaseError("auth/popup-blocked", "Popup blocked")
    )
    render(<SignInPage />)

    await user.click(screen.getByRole("button", { name: "Sign in with Google" }))

    await waitFor(() => {
      expect(mocks.signInRedirect).toHaveBeenCalledOnce()
    })
  })

  it("creates one server session per signed-in user", async () => {
    mocks.authState.user = {
      uid: "user-1",
      getIdToken: mocks.getIdToken,
    }
    const view = render(<SignInPage />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/")
    })

    view.rerender(<SignInPage />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })

    expect(mocks.getIdToken).not.toHaveBeenCalled()
    expect(mocks.refreshServerSession).toHaveBeenCalledOnce()
  })

  it("shows a session API error after auth state returns to signed out", async () => {
    mocks.authState.user = {
      uid: "user-1",
      getIdToken: mocks.getIdToken,
    }
    mocks.refreshServerSession.mockRejectedValue(
      new Error("Failed to refresh server session")
    )
    const view = render(<SignInPage />)

    await waitFor(() => {
      expect(mocks.refreshServerSession).toHaveBeenCalled()
    })
    mocks.authState.user = null
    view.rerender(<SignInPage />)

    expect(await screen.findByText("Failed to create session."))
      .toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("renders complete auth copy in English and Russian", () => {
    const view = render(<SignInPage />)
    expect(screen.getByRole("heading", { name: "Sign in to Kanban" }))
      .toBeInTheDocument()

    mocks.locale = "ru"
    view.rerender(<SignInPage />)
    expect(screen.getByRole("heading", { name: "Вход в Kanban" }))
      .toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Войти через Google" })
    ).toBeInTheDocument()
  })
})
