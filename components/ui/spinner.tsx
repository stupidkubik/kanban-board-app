import * as React from "react"

import { cn } from "@/lib/utils"
import styles from "@/components/ui/spinner.module.css"

type SpinnerProps = React.ComponentPropsWithoutRef<"span"> & {
  size?: "xs" | "sm" | "md"
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  const sizeClass =
    size === "xs"
      ? styles.sizeXs
      : size === "sm"
        ? styles.sizeSm
        : styles.sizeMd
  const ariaHidden = props["aria-hidden"] === true
  const ariaLabel =
    props["aria-label"] ?? (ariaHidden ? undefined : "Loading")

  return (
    <span
      {...props}
      className={cn(styles.spinner, sizeClass, className)}
      role="status"
      aria-label={ariaLabel}
    />
  )
}
