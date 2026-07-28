import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LabelsSection } from "@/features/labels/ui/labels-section"
import { getCopy } from "@/lib/i18n"
import type { BoardLabel } from "@/lib/types/boards"

const apiMocks = vi.hoisted(() => ({
  labels: [] as BoardLabel[],
  createLabel: vi.fn(),
  updateLabel: vi.fn(),
  deleteLabel: vi.fn(),
  createUnwrap: vi.fn(),
  updateUnwrap: vi.fn(),
  deleteUnwrap: vi.fn(),
}))

vi.mock("@/features/labels/data/labels-api", () => ({
  useGetBoardLabelsQuery: () => ({ data: apiMocks.labels }),
  useCreateBoardLabelMutation: () => [apiMocks.createLabel],
  useUpdateBoardLabelMutation: () => [apiMocks.updateLabel],
  useDeleteBoardLabelMutation: () => [apiMocks.deleteLabel],
}))

const uiCopy = getCopy("en")
const labels: BoardLabel[] = [
  {
    id: "bug",
    boardId: "board-1",
    name: "Bug",
    normalizedName: "bug",
    color: "red",
    order: 1,
  },
  {
    id: "feature",
    boardId: "board-1",
    name: "Feature",
    normalizedName: "feature",
    color: "green",
    order: 2,
  },
]

const renderSection = ({
  canEdit = true,
  setError = vi.fn(),
}: {
  canEdit?: boolean
  setError?: ReturnType<typeof vi.fn>
} = {}) => {
  const view = render(
    <LabelsSection
      boardId="board-1"
      canEdit={canEdit}
      uiCopy={uiCopy}
      setError={setError}
    />
  )

  return { ...view, setError }
}

beforeEach(() => {
  apiMocks.labels = []
  apiMocks.createLabel.mockReset()
  apiMocks.updateLabel.mockReset()
  apiMocks.deleteLabel.mockReset()
  apiMocks.createUnwrap.mockReset().mockResolvedValue(undefined)
  apiMocks.updateUnwrap.mockReset().mockResolvedValue(undefined)
  apiMocks.deleteUnwrap.mockReset().mockResolvedValue(undefined)
  apiMocks.createLabel.mockImplementation(() => ({ unwrap: apiMocks.createUnwrap }))
  apiMocks.updateLabel.mockImplementation(() => ({ unwrap: apiMocks.updateUnwrap }))
  apiMocks.deleteLabel.mockImplementation(() => ({ unwrap: apiMocks.deleteUnwrap }))
})

afterEach(cleanup)

describe("LabelsSection", () => {
  it("renders empty and populated read-only states for viewers", () => {
    const { rerender } = renderSection({ canEdit: false })

    expect(screen.getByText(uiCopy.board.labelEmpty)).toBeVisible()
    expect(screen.queryByTestId("create-label-trigger")).not.toBeInTheDocument()

    apiMocks.labels = labels
    rerender(
      <LabelsSection
        boardId="board-1"
        canEdit={false}
        uiCopy={uiCopy}
        setError={vi.fn()}
      />
    )

    expect(screen.getByText("Bug")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: `${uiCopy.board.editLabel}: Bug` })
    ).not.toBeInTheDocument()
  })

  it("validates creation and supports keyboard navigation in the palette", async () => {
    const user = userEvent.setup()
    const setError = vi.fn()
    renderSection({ setError })

    await user.click(screen.getByTestId("create-label-trigger"))
    const nameInput = screen.getByTestId("new-label-name")
    expect(nameInput).toHaveFocus()
    expect(screen.getByTestId("create-label")).toBeDisabled()

    fireEvent.submit(nameInput.closest("form")!)
    expect(setError).toHaveBeenCalledWith(
      uiCopy.board.errors.labelNameRequired
    )

    await user.type(nameInput, "Bug")
    const blue = screen.getByRole("radio", { name: uiCopy.board.labelColorBlue })
    const purple = screen.getByRole("radio", {
      name: uiCopy.board.labelColorPurple,
    })
    blue.focus()
    await user.keyboard("{ArrowRight}")

    expect(purple).toHaveFocus()
    expect(purple).toHaveAttribute("aria-checked", "true")

    await user.click(screen.getByTestId("create-label"))
    await waitFor(() =>
      expect(apiMocks.createLabel).toHaveBeenCalledWith({
        boardId: "board-1",
        name: "Bug",
        color: "purple",
      })
    )
    expect(screen.queryByTestId("new-label-name")).not.toBeInTheDocument()
  })

  it("supports dirty edit, cancel, delete confirmation, and focus return", async () => {
    const user = userEvent.setup()
    apiMocks.labels = [labels[0]]
    renderSection()

    await user.click(
      screen.getByRole("button", {
        name: `${uiCopy.board.editLabel}: Bug`,
      })
    )

    const nameInput = screen.getByRole("textbox", {
      name: `${uiCopy.board.labelNamePlaceholder}: Bug`,
    })
    const saveButton = screen.getByRole("button", {
      name: uiCopy.board.saveLabel,
    })
    expect(saveButton).toBeDisabled()

    await user.clear(nameInput)
    await user.type(nameInput, "Critical")
    expect(saveButton).toBeEnabled()
    await user.click(screen.getByRole("button", { name: uiCopy.common.cancel }))
    expect(screen.getByText("Bug")).toBeVisible()

    await user.click(
      screen.getByRole("button", {
        name: `${uiCopy.board.editLabel}: Bug`,
      })
    )
    const deleteButton = screen.getByRole("button", {
      name: `${uiCopy.board.deleteLabel}: Bug`,
    })
    await user.click(deleteButton)
    expect(
      screen.getByRole("alertdialog", { name: uiCopy.board.deleteLabelTitle })
    ).toHaveTextContent("Bug")

    await user.click(screen.getByRole("button", { name: uiCopy.common.cancel }))
    await waitFor(() => expect(deleteButton).toHaveFocus())

    await user.click(deleteButton)
    await user.click(screen.getByTestId("delete-label-confirm"))
    await waitFor(() =>
      expect(apiMocks.deleteLabel).toHaveBeenCalledWith({
        boardId: "board-1",
        labelId: "bug",
      })
    )
  })

  it("keeps unrelated rows enabled while one label update is pending", async () => {
    const user = userEvent.setup()
    let resolveUpdate: (() => void) | undefined
    apiMocks.labels = labels
    apiMocks.updateUnwrap.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve
      })
    )
    renderSection()

    await user.click(
      screen.getByRole("button", {
        name: `${uiCopy.board.editLabel}: Bug`,
      })
    )
    const nameInput = screen.getByRole("textbox", {
      name: `${uiCopy.board.labelNamePlaceholder}: Bug`,
    })
    await user.clear(nameInput)
    await user.type(nameInput, "Critical")
    await user.click(
      screen.getByRole("button", { name: uiCopy.board.saveLabel })
    )

    await waitFor(() => expect(nameInput).toBeDisabled())
    expect(
      screen.getByRole("button", {
        name: `${uiCopy.board.editLabel}: Feature`,
      })
    ).toBeEnabled()

    resolveUpdate?.()
    await waitFor(() =>
      expect(apiMocks.updateLabel).toHaveBeenCalledWith({
        boardId: "board-1",
        labelId: "bug",
        name: "Critical",
        color: "red",
      })
    )
  })

  it("disables an already-open create form when the realtime limit is reached", async () => {
    const user = userEvent.setup()
    apiMocks.labels = [labels[0]]
    const { rerender } = renderSection()

    await user.click(screen.getByTestId("create-label-trigger"))
    await user.type(screen.getByTestId("new-label-name"), "Blocked")

    apiMocks.labels = Array.from({ length: 50 }, (_, index) => ({
      ...labels[0],
      id: `label-${index}`,
      name: `Label ${index}`,
      normalizedName: `label ${index}`,
      order: index,
    }))
    rerender(
      <LabelsSection
        boardId="board-1"
        canEdit
        uiCopy={uiCopy}
        setError={vi.fn()}
      />
    )

    expect(screen.getByText(uiCopy.board.labelLimitReached)).toBeVisible()
    expect(screen.getByTestId("new-label-name")).toBeDisabled()
    expect(screen.getByTestId("create-label")).toBeDisabled()
  })
})
