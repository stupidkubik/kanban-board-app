import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ParticipantsSectionView } from "@/features/participants/ui/participants-section-view"
import { getCopy, roleLabels } from "@/lib/i18n"
import type { Participant } from "@/lib/types/board-ui"

const uiCopy = getCopy("en")
const participants: Participant[] = [
  {
    id: "owner",
    name: "Owner",
    secondaryLabel: "owner@example.com",
    photoURL: null,
    role: "owner",
    isYou: true,
  },
  {
    id: "editor",
    name: "Editor",
    secondaryLabel: "editor@example.com",
    photoURL: null,
    role: "editor",
    isYou: false,
  },
]

const renderView = (
  isOwner: boolean,
  onUpdateParticipantRole = vi.fn(),
  overrides: {
    participants?: Participant[]
    removePendingId?: string | null
    rolePendingId?: string | null
  } = {}
) => {
  const view = render(
    <ParticipantsSectionView
      uiCopy={uiCopy}
      uiLocale="en"
      participants={overrides.participants ?? participants}
      isOwner={isOwner}
      inviteEmail=""
      inviteRole="viewer"
      invitePending={false}
      removePendingId={overrides.removePendingId ?? null}
      rolePendingId={overrides.rolePendingId ?? null}
      leavePending={false}
      onInviteEmailChange={vi.fn()}
      onInviteRoleChange={vi.fn()}
      onInviteSubmit={vi.fn()}
      onRemoveParticipant={vi.fn()}
      onUpdateParticipantRole={onUpdateParticipantRole}
      onLeaveBoard={vi.fn()}
    />
  )
  return { ...view, onUpdateParticipantRole }
}

afterEach(cleanup)

describe("ParticipantsSectionView role controls", () => {
  it("hides invite and member removal controls from non-owners", () => {
    renderView(false)

    expect(
      screen.queryByTestId("invite-member-trigger")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: `${uiCopy.board.removeMember}: Editor`,
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("participant-role-editor")
    ).not.toBeInTheDocument()
    expect(screen.getAllByText(roleLabels.en.editor)).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: uiCopy.board.leaveBoard })
    ).toBeVisible()
  })

  it("shows invite and member removal controls to owners", async () => {
    const user = userEvent.setup()
    renderView(true)

    await user.click(screen.getByTestId("invite-member-trigger"))

    expect(screen.getByTestId("invite-email")).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: `${uiCopy.board.removeMember}: Editor`,
      })
    ).toBeInTheDocument()
    const roleSelect = screen.getByTestId("participant-role-editor")
    expect(roleSelect).toBeInTheDocument()
    expect(roleSelect).toHaveTextContent(roleLabels.en.editor)
  })

  it("keeps pending state scoped to the affected participant", () => {
    const viewer: Participant = {
      id: "viewer",
      name: "Viewer",
      secondaryLabel: "viewer@example.com",
      photoURL: null,
      role: "viewer",
      isYou: false,
    }

    renderView(true, vi.fn(), {
      participants: [...participants, viewer],
      rolePendingId: "editor",
      removePendingId: "viewer",
    })

    expect(screen.getByTestId("participant-role-editor")).toBeDisabled()
    expect(screen.getByTestId("participant-role-viewer")).toBeEnabled()
    expect(
      screen.getByRole("button", {
        name: `${uiCopy.board.removeMember}: Editor`,
      })
    ).toBeEnabled()
    expect(
      screen.getByRole("button", {
        name: `${uiCopy.board.removeMember}: Viewer`,
      })
    ).toBeDisabled()
  })
})
