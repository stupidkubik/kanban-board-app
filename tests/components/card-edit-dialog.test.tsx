import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { CardEditDialog } from "@/features/cards/ui/card-edit-dialog"
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
        editingCard={{
          id: "card-1",
          title: "Title",
          description: "",
          due: "",
          assigneeIds: [],
        }}
        assignees={[]}
        onSubmit={vi.fn()}
        onFieldChange={onFieldChange}
        onToggleAssignee={vi.fn()}
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
        editingCard={{
          id: "card-1",
          title: "Title",
          description: "",
          due: "",
          assigneeIds: [],
        }}
        assignees={[]}
        onSubmit={onSubmit}
        onFieldChange={vi.fn()}
        onToggleAssignee={vi.fn()}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: uiCopy.board.saveCard }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("toggles multiple assignees and disables editing for viewers", async () => {
    const user = userEvent.setup()
    const onToggleAssignee = vi.fn()
    const { rerender } = render(
      <CardEditDialog
        open
        canEdit
        updatingCard={false}
        uiCopy={uiCopy}
        editingCard={{
          id: "card-1",
          title: "Title",
          description: "",
          due: "",
          assigneeIds: ["owner"],
        }}
        assignees={[
          { id: "owner", name: "Owner", email: null, photoURL: null },
          { id: "editor", name: "Editor", email: null, photoURL: null },
        ]}
        onSubmit={vi.fn()}
        onFieldChange={vi.fn()}
        onToggleAssignee={onToggleAssignee}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole("checkbox", { name: "Owner" })).toBeChecked()
    await user.click(screen.getByRole("checkbox", { name: "Editor" }))
    expect(onToggleAssignee).toHaveBeenCalledWith("editor")

    rerender(
      <CardEditDialog
        open
        canEdit={false}
        updatingCard={false}
        uiCopy={uiCopy}
        editingCard={{
          id: "card-1",
          title: "Title",
          description: "",
          due: "",
          assigneeIds: ["owner"],
        }}
        assignees={[
          { id: "owner", name: "Owner", email: null, photoURL: null },
        ]}
        onSubmit={vi.fn()}
        onFieldChange={vi.fn()}
        onToggleAssignee={onToggleAssignee}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole("checkbox", { name: "Owner" })).toBeDisabled()
  })
})
