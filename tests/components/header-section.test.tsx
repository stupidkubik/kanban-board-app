import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { BoardHeader } from "@/features/board/ui/board-header"
import { getCopy } from "@/lib/i18n"

const uiCopy = getCopy("en")

afterEach(cleanup)

describe("BoardHeader", () => {
  it("renders header title", () => {
    render(
      <BoardHeader
        uiCopy={uiCopy}
        boardId="board-1"
        boardTitle="Board"
        isViewer={false}
      />
    )

    expect(screen.getByText("Board")).toBeInTheDocument()
  })

  it("shows read-only notice for viewers", () => {
    render(
      <BoardHeader
        uiCopy={uiCopy}
        boardId="board-1"
        boardTitle="Board"
        isViewer
      />
    )

    expect(screen.getByText(uiCopy.board.readOnlyNotice)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: uiCopy.board.backToBoards })).toBeVisible()
  })
})
