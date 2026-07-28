import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ParticipantsSection } from "@/features/participants/ui/participants-section"
import { getCopy } from "@/lib/i18n"
import type { Board } from "@/lib/types/boards"
import type { Participant } from "@/lib/types/board-ui"

const participants: Participant[] = Array.from({ length: 6 }, (_, index) => ({
  id: `member-${index}`,
  name: `Member ${index}`,
  secondaryLabel: `member-${index}@example.com`,
  photoURL: null,
  role: index === 0 ? "owner" : "editor",
  isYou: index === 0,
}))

vi.mock("@/features/participants/model/use-board-participants", () => ({
  useBoardParticipants: () => ({
    participants,
    inviteEmail: "",
    inviteRole: "editor",
    invitePending: false,
    removePendingId: null,
    rolePendingId: null,
    leavePending: false,
    setInviteEmail: vi.fn(),
    setInviteRole: vi.fn(),
    handleInvite: vi.fn(),
    handleRemoveParticipant: vi.fn(),
    handleUpdateParticipantRole: vi.fn(),
    handleLeaveBoard: vi.fn(),
  }),
}))

const uiCopy = getCopy("en")
const board: Board = {
  id: "board-1",
  title: "Board",
  ownerId: "member-0",
  members: Object.fromEntries(
    participants.map((participant) => [participant.id, true])
  ),
}

afterEach(cleanup)

describe("ParticipantsSection", () => {
  it("keeps an accessible mobile-safe trigger and returns focus after closing", async () => {
    const user = userEvent.setup()
    render(
      <ParticipantsSection
        boardId={board.id}
        board={board}
        user={null}
        isOwner
        uiCopy={uiCopy}
        uiLocale="en"
        setError={vi.fn()}
      />
    )

    const trigger = screen.getByRole("button", {
      name: uiCopy.board.participantsManager,
    })
    expect(trigger).toHaveTextContent("+1")

    await user.click(trigger)
    expect(
      screen.getByRole("dialog", {
        name: uiCopy.board.participantsManager,
      })
    ).toBeVisible()
    expect(screen.getByTestId("participants-section")).toBeVisible()

    await user.click(screen.getByTestId("close-participants-manager"))
    expect(trigger).toHaveFocus()
  })
})
