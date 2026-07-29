import type { BoardLabel } from "@/lib/types/boards"
import styles from "@/features/cards/ui/cards.module.css"

export const CardLabelList = ({
  labels,
  ariaLabel,
}: {
  labels: BoardLabel[]
  ariaLabel: string
}) => {
  if (!labels.length) return null
  return (
    <div
      className={styles.cardLabels}
      aria-label={ariaLabel}
      data-testid="card-labels"
    >
      {labels.map((label) => (
        <span
          key={label.id}
          className={styles.cardLabelChip}
          data-color={label.color}
          title={label.name}
        >
          {label.name}
        </span>
      ))}
    </div>
  )
}
