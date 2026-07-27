import type { CardAssignee } from "@/lib/types/board-ui"
import styles from "@/features/cards/ui/cards.module.css"

type CardAssigneeListProps = {
  assignees: CardAssignee[]
  label: string
}

export const CardAssigneeList = ({
  assignees,
  label,
}: CardAssigneeListProps) => {
  if (!assignees.length) {
    return null
  }

  const visible = assignees.slice(0, 3)
  return (
    <div
      className={styles.cardAssignees}
      aria-label={label}
      data-testid="card-assignees"
    >
      {visible.map((assignee) => (
        <span
          key={assignee.id}
          className={styles.cardAssigneeChip}
          title={assignee.email || assignee.name}
        >
          <span className={styles.cardAssigneeAvatar} aria-hidden="true">
            {assignee.name.slice(0, 1).toUpperCase()}
          </span>
          <span>{assignee.name}</span>
        </span>
      ))}
      {assignees.length > visible.length ? (
        <span className={styles.cardAssigneeOverflow}>
          +{assignees.length - visible.length}
        </span>
      ) : null}
    </div>
  )
}
