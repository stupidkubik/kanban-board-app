import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { IconButton } from "@/components/ui/icon-button"

describe("IconButton", () => {
  it("requires an accessible label while preserving icon-button sizing", () => {
    render(
      <IconButton label="Delete label" size="icon-sm">
        <svg aria-hidden="true" />
      </IconButton>
    )

    const button = screen.getByRole("button", { name: "Delete label" })
    expect(button).toHaveAttribute("data-size", "icon-sm")
  })
})
