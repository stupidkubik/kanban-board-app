import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  NotificationsProvider,
  useNotifications,
} from "@/features/notifications/ui/notifications-provider"

type HarnessProps = {
  onUndo?: () => void
}

const Harness = ({ onUndo }: HarnessProps) => {
  const { notify } = useNotifications()

  return (
    <div>
      <button
        type="button"
        onClick={() => notify({ message: "Saved", durationMs: 0 })}
      >
        Notify
      </button>
      <button
        type="button"
        onClick={() =>
          notify({
            message: "Deleted",
            actionLabel: "Undo",
            onAction: onUndo,
            durationMs: 0,
          })
        }
      >
        Notify undo
      </button>
    </div>
  )
}

describe("NotificationsProvider", () => {
  afterEach(() => cleanup())

  it("renders and dismisses a toast", async () => {
    const user = userEvent.setup()
    render(
      <NotificationsProvider>
        <Harness />
      </NotificationsProvider>
    )

    await user.click(screen.getByRole("button", { name: "Notify" }))
    expect(screen.getByText("Saved")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Saved" }))
    expect(screen.queryByText("Saved")).not.toBeInTheDocument()
  })

  it("runs undo action and closes toast", async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()

    render(
      <NotificationsProvider>
        <Harness onUndo={onUndo} />
      </NotificationsProvider>
    )

    await user.click(screen.getByRole("button", { name: "Notify undo" }))
    expect(screen.getByText("Deleted")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Undo" }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument()
  })
})
