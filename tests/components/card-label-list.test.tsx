import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CardLabelList } from "@/features/labels/ui/card-label-list"

describe("CardLabelList", () => {
  it("keeps the full label name available when the chip is visually truncated", () => {
    const longName = "Very long label name that does not fit inside a card"

    render(
      <CardLabelList
        ariaLabel="Labels"
        labels={[
          {
            id: "label-1",
            boardId: "board-1",
            name: longName,
            normalizedName: longName.toLowerCase(),
            color: "blue",
            order: 1,
          },
        ]}
      />
    )

    expect(screen.getByText(longName)).toHaveAttribute("title", longName)
  })
})
