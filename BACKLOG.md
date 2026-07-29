# Backlog

Only deliberately deferred work belongs here. Completed audit and refactoring
items are recorded in `docs/DEVELOPMENT_HISTORY.md`.

Effort guide: **S** — up to two days, **M** — roughly three to five days,
**L** — one or more weeks.

| Opportunity | Why it matters | Effort |
| --- | --- | :---: |
| Search and filters | Find cards by title, label, assignee, or due date on a busy board | M |
| Checklists and comments | Support richer task execution without leaving the card | L |
| Activity log | Explain who changed roles, cards, labels, or board structure | M |
| Due-date reminders | Surface today/tomorrow deadlines through in-app or email notifications | M |
| Board templates and cloning | Reduce setup time for recurring workflows | S–M |
| Ownership transfer | Let teams safely hand a board to another member | M |
| Offline mutation queue | Preserve edits across unreliable network connections | L |
| Pagination or virtualization | Support boards beyond the current 500-card product cap | L |
| Time-zone preferences | Make due dates unambiguous for distributed teams | M |
| External client telemetry | Capture browser-only failures when existing observability proves insufficient | S–M |

## Decision notes

- Archive UI is not planned unless a concrete workflow requires it.
- Pagination cannot be added independently of cross-page drag-and-drop and
  ordering semantics.
- External telemetry should solve a demonstrated diagnostic gap; Vercel and
  Firebase Console remain the current baseline.
- Any ownership-transfer design must preserve the single-owner invariant in API
  transactions and Firestore Rules.
