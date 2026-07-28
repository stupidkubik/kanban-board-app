"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import styles from "@/components/ui/tooltip.module.css"

function TooltipProvider(props: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={400} {...props} />
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipPrimitive.Provider>
  )
}

function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn(styles.content, className)} {...props} />
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
