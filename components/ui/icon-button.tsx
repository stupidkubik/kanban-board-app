"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, "aria-label" | "size"> & {
  label: string
  size?: Extract<React.ComponentProps<typeof Button>["size"], "icon-xs" | "icon-sm" | "icon" | "icon-lg">
  tooltip?: string
}

function IconButton({ label, tooltip = label, size = "icon", ...props }: IconButtonProps) {
  const button = <Button aria-label={label} size={size} {...props} />

  if (!tooltip) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export { IconButton }
