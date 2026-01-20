import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { HeaderSection } from "@/features/columns/ui/header-section"
import { getCopy } from "@/lib/i18n"

const uiCopy = getCopy("en")

describe("HeaderSection", () => {
  it("shows add column button and triggers toggle", async () => {
    const user = userEvent.setup()
    const onToggleAddColumn = vi.fn()

    render(
      <HeaderSection
        uiCopy={uiCopy}
        boardTitle="Board"
        canEdit
        isViewer={false}
        boardLanguage="en"
        canEditLanguage
        languagePending={false}
        showAddColumn={false}
        creatingColumn={false}
        newColumnTitle=""
        onNewColumnTitleChange={vi.fn()}
        onToggleAddColumn={onToggleAddColumn}
        onCreateColumn={vi.fn()}
        onBoardLanguageChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: uiCopy.board.addColumn }))
    expect(onToggleAddColumn).toHaveBeenCalledWith(true)
  })

  it("renders create column form when open", () => {
    const onNewColumnTitleChange = vi.fn()
    render(
      <HeaderSection
        uiCopy={uiCopy}
        boardTitle="Board"
        canEdit
        isViewer={false}
        boardLanguage="en"
        canEditLanguage
        languagePending={false}
        showAddColumn
        creatingColumn={false}
        newColumnTitle=""
        onNewColumnTitleChange={onNewColumnTitleChange}
        onToggleAddColumn={vi.fn()}
        onCreateColumn={vi.fn()}
        onBoardLanguageChange={vi.fn()}
      />
    )

    const input = screen.getByLabelText(uiCopy.board.columnNamePlaceholder)
    fireEvent.change(input, { target: { value: "Todo" } })
    expect(onNewColumnTitleChange).toHaveBeenCalledWith("Todo")
  })

  it("shows read-only notice for viewers", () => {
    render(
      <HeaderSection
        uiCopy={uiCopy}
        boardTitle="Board"
        canEdit={false}
        isViewer
        boardLanguage="en"
        canEditLanguage={false}
        languagePending={false}
        showAddColumn={false}
        creatingColumn={false}
        newColumnTitle=""
        onNewColumnTitleChange={vi.fn()}
        onToggleAddColumn={vi.fn()}
        onCreateColumn={vi.fn()}
        onBoardLanguageChange={vi.fn()}
      />
    )

    expect(screen.getByText(uiCopy.board.readOnlyNotice)).toBeInTheDocument()
  })
})
