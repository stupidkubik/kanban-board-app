import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { HeaderSection } from "@/features/columns/ui/header-section"
import { getCopy } from "@/lib/i18n"

const uiCopy = getCopy("en")

afterEach(cleanup)

describe("HeaderSection", () => {
  it("renders header title", () => {
    render(
      <HeaderSection
        uiCopy={uiCopy}
        boardId="board-1"
        boardTitle="Board"
        isViewer={false}
        boardLanguage="en"
        canEdit
        updatingBoardLanguage={false}
        onBoardLanguageChange={vi.fn()}
        uiLocale="en"
        onUiLocaleChange={vi.fn()}
      />
    )

    expect(screen.getByText("Board")).toBeInTheDocument()
  })

  it("shows read-only notice for viewers", () => {
    render(
      <HeaderSection
        uiCopy={uiCopy}
        boardId="board-1"
        boardTitle="Board"
        isViewer
        boardLanguage="en"
        canEdit={false}
        updatingBoardLanguage={false}
        onBoardLanguageChange={vi.fn()}
        uiLocale="en"
        onUiLocaleChange={vi.fn()}
      />
    )

    expect(screen.getByText(uiCopy.board.readOnlyNotice)).toBeInTheDocument()
    expect(screen.getByLabelText(uiCopy.board.boardLanguageLabel)).toBeDisabled()
  })
})
