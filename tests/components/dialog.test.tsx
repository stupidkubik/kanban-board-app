import * as React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">Open manager</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manager</DialogTitle>
          <DialogDescription>Manage board settings.</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button type="button">Close manager</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

describe("Dialog", () => {
  it("traps interaction in the modal and returns focus to its trigger", async () => {
    const user = userEvent.setup()
    render(<ExampleDialog />)

    const trigger = screen.getByRole("button", { name: "Open manager" })
    await user.click(trigger)

    expect(screen.getByRole("dialog", { name: "Manager" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Close manager" })).toHaveFocus()

    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog", { name: "Manager" })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
