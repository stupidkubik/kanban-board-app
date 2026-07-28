# UI patterns

This reference records the UI/UX refactor conventions used across the app.

## Page hierarchy

- The board page is a work-first layout: sticky header and toolbar, then the
  horizontally scrollable column canvas.
- Home uses a bounded content container; board cards remain readable rather
  than expanding into wide, sparse tiles.
- Management actions stay out of document flow. Participants and labels open
  from toolbar triggers in dialogs.

## Dialog policy

- Use `Dialog` for create, edit, settings, and other reversible forms.
- Use `AlertDialog` only to confirm destructive actions such as deleting a
  board, card, column, label, or member.
- Dialog triggers must retain focus after close. On mobile, dialogs must fit
  inside the viewport and keep their primary action reachable.

## Responsive and accessible controls

- Controls provide visible keyboard focus and coarse-pointer targets.
- Labels supplement placeholders in longer forms.
- Color is never the only status signal: overdue cards include an explicit
  text label.
- The board canvas uses horizontal scrolling and snap points on small screens;
  a column occupies the available viewport width instead of shrinking below a
  readable size.

## Role-aware UI

- Viewer retains the same information architecture but sees no edit actions.
- Owner-only destructive actions remain protected in both the UI and server
  rules.
- Pending state is scoped to the action being performed, not the entire
  manager or board.
