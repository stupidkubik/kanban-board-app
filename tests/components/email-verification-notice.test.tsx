import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  sendEmailVerification: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  sendEmailVerification: mocks.sendEmailVerification,
}))

vi.mock("@/features/notifications/ui/notifications-provider", () => ({
  useNotifications: () => ({
    notifyError: mocks.notifyError,
    notifySuccess: mocks.notifySuccess,
  }),
}))

import { EmailVerificationNotice } from "@/features/invites/ui/email-verification-notice"
import { getCopy } from "@/lib/i18n"

const uiCopy = getCopy("en")

const makeUser = (verifiedAfterReload: boolean) => {
  const user = {
    email: "new@example.com",
    emailVerified: false,
    getIdToken: vi.fn().mockResolvedValue("token"),
    reload: vi.fn(async () => {
      user.emailVerified = verifiedAfterReload
    }),
  }
  return user
}

const renderNotice = (user: ReturnType<typeof makeUser>) =>
  render(
    <EmailVerificationNotice
      uiCopy={uiCopy}
      user={
        user as unknown as Parameters<typeof EmailVerificationNotice>[0]["user"]
      }
    />
  )

describe("EmailVerificationNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("refreshes the ID token once the address is verified", async () => {
    const user = makeUser(true)
    renderNotice(user)

    await userEvent.click(
      screen.getByRole("button", { name: uiCopy.board.verifyEmailCheck })
    )

    await waitFor(() => expect(user.getIdToken).toHaveBeenCalledWith(true))
    expect(mocks.notifyError).not.toHaveBeenCalled()
  })

  it("keeps the notice and explains when the address is still unverified", async () => {
    const user = makeUser(false)
    renderNotice(user)

    await userEvent.click(
      screen.getByRole("button", { name: uiCopy.board.verifyEmailCheck })
    )

    await waitFor(() =>
      expect(mocks.notifyError).toHaveBeenCalledWith(
        uiCopy.board.verifyEmailPending
      )
    )
    expect(user.getIdToken).not.toHaveBeenCalled()
  })

  it("resends the verification email", async () => {
    mocks.sendEmailVerification.mockResolvedValue(undefined)
    const user = makeUser(false)
    renderNotice(user)

    await userEvent.click(
      screen.getByRole("button", { name: uiCopy.board.verifyEmailResend })
    )

    await waitFor(() =>
      expect(mocks.notifySuccess).toHaveBeenCalledWith(
        uiCopy.board.verifyEmailSent
      )
    )
    expect(mocks.sendEmailVerification).toHaveBeenCalledWith(user)
  })
})
