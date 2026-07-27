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
          labelIds: [],
        }}
        assignees={[]}
        labels={[]}
        onSubmit={vi.fn()}
        onFieldChange={onFieldChange}
        onToggleAssignee={vi.fn()}
        onToggleLabel={vi.fn()}
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
          labelIds: [],
        }}
        assignees={[]}
        labels={[]}
        onSubmit={onSubmit}
        onFieldChange={vi.fn()}
        onToggleAssignee={vi.fn()}
        onToggleLabel={vi.fn()}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: uiCopy.board.saveCard }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("toggles multiple assignees and disables editing for viewers", async () => {
    const user = userEvent.setup()
    const onToggleAssignee = vi.fn()
    const onToggleLabel = vi.fn()
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
          labelIds: ["label-1"],
        }}
        assignees={[
          { id: "owner", name: "Owner", email: null, photoURL: null },
          { id: "editor", name: "Editor", email: null, photoURL: null },
        ]}
        labels={[
          {
            id: "label-1",
            boardId: "board-1",
            name: "Bug",
            normalizedName: "bug",
            color: "red",
            order: 1,
          },
          {
            id: "label-2",
            boardId: "board-1",
            name: "Backend",
            normalizedName: "backend",
            color: "blue",
            order: 2,
          },
        ]}
        onSubmit={vi.fn()}
        onFieldChange={vi.fn()}
        onToggleAssignee={onToggleAssignee}
        onToggleLabel={onToggleLabel}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole("checkbox", { name: "Owner" })).toBeChecked()
    await user.click(screen.getByRole("checkbox", { name: "Editor" }))
    expect(onToggleAssignee).toHaveBeenCalledWith("editor")
    expect(screen.getByRole("checkbox", { name: "Bug" })).toBeChecked()
    await user.click(screen.getByRole("checkbox", { name: "Backend" }))
    expect(onToggleLabel).toHaveBeenCalledWith("label-2")

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
          labelIds: ["label-1"],
        }}
        assignees={[
          { id: "owner", name: "Owner", email: null, photoURL: null },
        ]}
        labels={[
          {
            id: "label-1",
            boardId: "board-1",
            name: "Bug",
            normalizedName: "bug",
            color: "red",
            order: 1,
          },
        ]}
        onSubmit={vi.fn()}
        onFieldChange={vi.fn()}
        onToggleAssignee={onToggleAssignee}
        onToggleLabel={onToggleLabel}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole("checkbox", { name: "Owner" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Bug" })).toBeDisabled()
  })
})
