import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ParticipantsSectionView } from "@/features/participants/ui/participants-section-view"
import { getCopy } from "@/lib/i18n"
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

const renderView = (isOwner: boolean) =>
  render(
    <ParticipantsSectionView
      uiCopy={uiCopy}
      uiLocale="en"
      participants={participants}
      isOwner={isOwner}
      canEdit={false}
      creatingColumn={false}
      newColumnTitle=""
      onNewColumnTitleChange={vi.fn()}
      onCreateColumn={vi.fn()}
      inviteEmail=""
      inviteRole="viewer"
      invitePending={false}
      removePendingId={null}
      leavePending={false}
      onInviteEmailChange={vi.fn()}
      onInviteRoleChange={vi.fn()}
      onInviteSubmit={vi.fn()}
      onRemoveParticipant={vi.fn()}
      onLeaveBoard={vi.fn()}
    />
  )

afterEach(cleanup)

describe("ParticipantsSectionView role controls", () => {
  it("hides invite and member removal controls from non-owners", async () => {
    const user = userEvent.setup()
    renderView(false)

    expect(
      screen.queryByTestId("invite-member-trigger")
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: uiCopy.board.participantsShow })
    )
    expect(
      screen.queryByRole("button", { name: uiCopy.board.removeMember })
    ).not.toBeInTheDocument()
  })

  it("shows invite and member removal controls to owners", async () => {
    const user = userEvent.setup()
    renderView(true)

    await user.click(screen.getByTestId("invite-member-trigger"))

    expect(screen.getByTestId("invite-email")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: uiCopy.board.removeMember })
    ).toBeInTheDocument()
  })
})
