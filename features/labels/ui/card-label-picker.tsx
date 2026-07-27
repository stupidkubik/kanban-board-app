import type { BoardLabel } from "@/lib/types/boards"
import styles from "@/features/cards/ui/cards.module.css"

type CardLabelPickerProps = {
  labels: BoardLabel[]
  selectedIds: string[]
  label: string
  emptyLabel: string
  disabled: boolean
  testId: string
  onToggle: (labelId: string) => void
}

export const CardLabelPicker = ({
  labels,
  selectedIds,
  label,
  emptyLabel,
  disabled,
  testId,
  onToggle,
}: CardLabelPickerProps) => {
  const selected = new Set(selectedIds)
  return (
    <fieldset
      className={styles.labelPicker}
      disabled={disabled}
      data-testid={testId}
    >
      <legend className={styles.assigneePickerLabel}>
        {label} ({selected.size})
      </legend>
      {labels.length ? (
        <div className={styles.labelOptions}>
          {labels.map((item) => (
            <label
              key={item.id}
              className={styles.labelOption}
              data-color={item.color}
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => onToggle(item.id)}
                aria-label={item.name}
              />
              <span className={styles.labelDot} aria-hidden="true" />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <span className={styles.assigneeEmpty}>{emptyLabel}</span>
      )}
    </fieldset>
  )
}
