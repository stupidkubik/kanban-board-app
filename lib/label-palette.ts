import type { CSSProperties } from "react"

import type { BoardLabelColor } from "@/lib/types/boards"

const labelColorVariables: Record<BoardLabelColor, string> = {
  gray: "var(--color-label-gray)",
  red: "var(--color-label-red)",
  orange: "var(--color-label-orange)",
  yellow: "var(--color-label-yellow)",
  green: "var(--color-label-green)",
  blue: "var(--color-label-blue)",
  purple: "var(--color-label-purple)",
  pink: "var(--color-label-pink)",
}

export const getLabelColorStyle = (color: BoardLabelColor): CSSProperties =>
  ({ "--label-color": labelColorVariables[color] }) as CSSProperties
