import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { BoardToolbar } from "@/features/board/ui/board-toolbar"
import { getCopy } from "@/lib/i18n"
import type { Board } from "@/lib/types/boards"

vi.mock("@/features/participants/ui/participants-section", () => ({
  ParticipantsSection: ({ isOwner }: { isOwner: boolean }) => (
    <button
      type="button"
      data-testid="participants-manager-trigger"
      data-owner={String(isOwner)}
    />
  ),
}))

vi.mock("@/features/labels/ui/labels-section", () => ({
  LabelsSection: ({ canEdit }: { canEdit: boolean }) => (
    <div data-testid="labels-section" data-can-edit={String(canEdit)} />
  ),
}))

const uiCopy = getCopy("en")
const board: Board = {
  id: "board-1",
  title: "Board",
  ownerId: "owner",
  members: { owner: true },
  roles: { owner: "owner" },
  language: "en",
}

const renderToolbar = ({
  canEdit = true,
  isOwner = true,
}: {
  canEdit?: boolean
  isOwner?: boolean
} = {}) => {
  const onCreateColumn = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  })
  const onNewColumnTitleChange = vi.fn()

  const view = render(
    <BoardToolbar
      boardId={board.id}
      board={board}
      user={null}
      canEdit={canEdit}
      isOwner={isOwner}
      uiCopy={uiCopy}
      uiLocale="en"
      onUiLocaleChange={vi.fn()}
      boardLanguage="en"
      updatingBoardLanguage={false}
      onBoardLanguageChange={vi.fn()}
      creatingColumn={false}
      newColumnTitle=""
      onNewColumnTitleChange={onNewColumnTitleChange}
      onCreateColumn={onCreateColumn}
      setError={vi.fn()}
    />
  )

  return { ...view, onCreateColumn, onNewColumnTitleChange }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

describe("BoardToolbar", () => {
  it("exposes edit actions and returns focus from manager dialogs", async () => {
    const user = userEvent.setup()
    const { onCreateColumn, onNewColumnTitleChange } = renderToolbar()

    const participantsTrigger = screen.getByTestId("participants-manager-trigger")
    expect(participantsTrigger).toHaveAttribute(
      "data-owner",
      "true"
    )

    const labelsTrigger = screen.getByTestId("labels-manager-trigger")
    await user.click(labelsTrigger)
    expect(screen.getByTestId("labels-section")).toHaveAttribute(
      "data-can-edit",
      "true"
    )

    await user.click(screen.getByTestId("close-labels-manager"))
    expect(labelsTrigger).toHaveFocus()

    await user.type(screen.getByTestId("new-column-title"), "Todo")
    expect(onNewColumnTitleChange).toHaveBeenCalled()
    await user.click(screen.getByTestId("create-column-submit"))
    expect(onCreateColumn).toHaveBeenCalledOnce()
  })

  it("keeps managers readable while hiding edit actions from viewers", async () => {
    const user = userEvent.setup()
    renderToolbar({ canEdit: false, isOwner: false })

    expect(screen.queryByTestId("new-column-title")).not.toBeInTheDocument()
    expect(screen.queryByTestId("create-column-submit")).not.toBeInTheDocument()

    expect(screen.getByTestId("participants-manager-trigger")).toHaveAttribute(
      "data-owner",
      "false"
    )

    await user.click(screen.getByTestId("labels-manager-trigger"))
    expect(screen.getByTestId("labels-section")).toHaveAttribute(
      "data-can-edit",
      "false"
    )
    await user.keyboard("{Escape}")

    const settingsTrigger = screen.getByRole("button", {
      name: uiCopy.board.boardSettings,
    })
    await user.click(settingsTrigger)
    expect(
      screen.getByRole("combobox", { name: uiCopy.board.boardLanguageLabel })
    ).toBeDisabled()

    await user.keyboard("{Escape}")
    expect(settingsTrigger).toHaveFocus()
  })
})
