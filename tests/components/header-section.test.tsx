import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { HeaderSection } from "@/features/columns/ui/header-section"
import { getCopy } from "@/lib/i18n"

const uiCopy = getCopy("en")

describe("HeaderSection", () => {
  it("renders header title", () => {
    render(
      <HeaderSection
        uiCopy={uiCopy}
        boardId="board-1"
        boardTitle="Board"
        isViewer={false}
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
        uiLocale="en"
        onUiLocaleChange={vi.fn()}
      />
    )

    expect(screen.getByText(uiCopy.board.readOnlyNotice)).toBeInTheDocument()
  })
})
