"use client"

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
  return (
    <div className={styles.colorPicker} role="radiogroup" aria-label={ariaLabel} data-testid={testId}>
      {BOARD_LABEL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={styles.colorOption}
          data-color={color}
          data-testid={`${testId}-${color}`}
          role="radio"
          aria-checked={value === color}
          aria-label={labels[color]}
          disabled={disabled}
          onClick={() => onValueChange(color)}
        >
          <span className={styles.colorDot} aria-hidden="true" />
          <span className="srOnly">{labels[color]}</span>
        </button>
      ))}
    </div>
  )
}
