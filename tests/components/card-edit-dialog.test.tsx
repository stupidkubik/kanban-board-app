import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { CardEditDialog } from "@/components/board/card-edit-dialog"
import { getCopy } from "@/lib/i18n"

const uiCopy = getCopy("en")

describe("CardEditDialog", () => {
  it("renders fields and updates values", () => {
    const onFieldChange = vi.fn()
    render(
      <CardEditDialog
        open
        canEdit
        updatingCard={false}
        uiCopy={uiCopy}
        editingCard={{ id: "card-1", title: "Title", description: "", due: "" }}
        onSubmit={vi.fn()}
        onFieldChange={onFieldChange}
        onClose={vi.fn()}
      />
    )

    fireEvent.change(
      screen.getByLabelText(uiCopy.board.cardTitlePlaceholder),
      { target: { value: "New title" } }
    )
    expect(onFieldChange).toHaveBeenCalledWith("title", "New title")
  })

  it("submits the form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
    })

    render(
      <CardEditDialog
        open
        canEdit
        updatingCard={false}
        uiCopy={uiCopy}
        editingCard={{ id: "card-1", title: "Title", description: "", due: "" }}
        onSubmit={onSubmit}
        onFieldChange={vi.fn()}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: uiCopy.board.saveCard }))
    expect(onSubmit).toHaveBeenCalled()
  })
})
