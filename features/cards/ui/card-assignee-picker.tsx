import type { CardAssignee } from "@/lib/types/board-ui"
import styles from "@/features/cards/ui/cards.module.css"

type CardAssigneePickerProps = {
  assignees: CardAssignee[]
  selectedIds: string[]
  label: string
  emptyLabel: string
  disabled: boolean
  testId: string
  onToggle: (assigneeId: string) => void
}

export const CardAssigneePicker = ({
  assignees,
  selectedIds,
  label,
  emptyLabel,
  disabled,
  testId,
  onToggle,
}: CardAssigneePickerProps) => {
  const selected = new Set(selectedIds)

  return (
    <fieldset
      className={styles.assigneePicker}
      disabled={disabled}
      data-testid={testId}
    >
      <legend className={styles.assigneePickerLabel}>
        {label} ({selected.size})
      </legend>
      {assignees.length ? (
        <div className={styles.assigneeOptions}>
          {assignees.map((assignee) => (
            <label key={assignee.id} className={styles.assigneeOption}>
              <input
                type="checkbox"
                checked={selected.has(assignee.id)}
                onChange={() => onToggle(assignee.id)}
                aria-label={assignee.name}
              />
              <span>
                <strong>{assignee.name}</strong>
                {assignee.email && assignee.email !== assignee.name ? (
                  <small>{assignee.email}</small>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <span className={styles.assigneeEmpty}>{emptyLabel}</span>
      )}
    </fieldset>
  )
}
