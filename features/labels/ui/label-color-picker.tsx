"use client"

import * as React from "react"

import { BOARD_LABEL_COLORS, type BoardLabelColor } from "@/lib/types/boards"
import styles from "@/features/labels/ui/labels.module.css"

type LabelColorPickerProps = {
  value: BoardLabelColor
  labels: Record<BoardLabelColor, string>
  onValueChange: (value: BoardLabelColor) => void
  disabled?: boolean
  testId: string
  ariaLabel: string
}

export function LabelColorPicker({ value, labels, onValueChange, disabled = false, testId, ariaLabel }: LabelColorPickerProps) {
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = BOARD_LABEL_COLORS.indexOf(value)

  const selectAndFocus = (index: number) => {
    const color = BOARD_LABEL_COLORS[index]
    onValueChange(color)
    optionRefs.current[index]?.focus()
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex: number | null = null

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % BOARD_LABEL_COLORS.length
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (index - 1 + BOARD_LABEL_COLORS.length) % BOARD_LABEL_COLORS.length
    } else if (event.key === "Home") {
      nextIndex = 0
    } else if (event.key === "End") {
      nextIndex = BOARD_LABEL_COLORS.length - 1
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    selectAndFocus(nextIndex)
  }

  return (
    <div className={styles.colorPicker} role="radiogroup" aria-label={ariaLabel} data-testid={testId}>
      {BOARD_LABEL_COLORS.map((color, index) => (
        <button
          key={color}
          type="button"
          className={styles.colorOption}
          data-color={color}
          data-testid={`${testId}-${color}`}
          role="radio"
          aria-checked={value === color}
          aria-label={labels[color]}
          tabIndex={selectedIndex === index ? 0 : -1}
          disabled={disabled}
          onClick={() => onValueChange(color)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(element) => {
            optionRefs.current[index] = element
          }}
        >
          <span className={styles.colorDot} aria-hidden="true" />
          <span className="srOnly">{labels[color]}</span>
        </button>
      ))}
    </div>
  )
}
