# UI/UX refactor baseline

- Date: 28 July 2026
- Scope: the UI/UX refactor described in `docs/UI_UX_REFACTOR_PLAN.md`
- Reference viewport: 2560 × 1352 desktop and Chrome responsive 375 × 873 mobile
- Baseline branch: `main` at `7cff385`

This document records the pre-refactor visual and behavioural contract. It is
deliberately separate from the proposal, so later phases can compare their work
without changing the description of the target state.

## Reference screenshots

All assets are tracked in `screenshots/`; timestamps in their filenames are the
capture identifiers.

| Capture | Viewport / theme | State | What it establishes |
| --- | --- | --- | --- |
| `16.36.24` | 2560 × 1352, light | Home with many boards | Wide grid density and colourful board covers. |
| `16.37.35` | 2560 × 1352, light | Sign-in | Current centered auth form. |
| `16.37.43` | 2560 × 1352, dark | Sign-in | Dark auth contrast and form scale. |
| `16.37.57` | 2560 × 1352, dark | Home with many boards | Dark home shell and board-card density. |
| `16.42.16` | 2560 × 1352, light | Board, labels empty, populated column | Board canvas starts below the management blocks. |
| `16.42.50` | 2560 × 1352, light | Board, two label edit rows | Header, participants/create-column block and expanded label catalogue. |
| `16.42.58` | 2560 × 1352, light | Board, populated column and label rows | Card density, horizontal canvas and label form scale. |
| `16.48.49` | 375 × 873, light | Home | Current mobile home header, sorting controls and board cards. |
| `16.49.20` | 375 × 873, light | Board, add-column prompt | Mobile header wrap and create-column interaction. |
| `16.49.38` | 375 × 873, light | Board, populated columns | Mobile horizontal canvas after the label catalogue. |
| `16.49.46` | 375 × 873, light | Card edit dialog | Full card form in the current mobile modal. |

The following useful states are intentionally recorded as a capture backlog, not
as a release blocker for phase 0: mobile sign-in; create-board; empty home and
board; loading, forbidden and recoverable error; viewer board on desktop and
mobile; multi-person participants; active DnD/drop target in both themes; and
the mobile keyboard with the card form open. Capture each state when its owning
phase has a runnable fixture, rather than coupling baseline work to production
data.

## Layout measurements

Measurements are screenshot pixels and apply only to the captured content; they
are comparison anchors, not design tokens.

| Metric | Capture | Baseline |
| --- | --- | --- |
| Board header height | `16.42.50` | 48 px (y=32–80) |
| Participants / add-column block height | `16.42.50` | 98 px (y=107–205) |
| Labels manager height with two edit rows | `16.42.50` | 228 px (y=231–459) |
| First column top | `16.42.50` | y=484 px |
| Header end to first column | `16.42.50` | 404 px |
| Management blocks before first column | `16.42.50` | 352 px, excluding the 26 px gaps |

The target for phase 2 is qualitative but testable: after loading a board, the
first column headers and cards must be visible in the first viewport without
scrolling past participants or labels.

## Role and scenario contract

| Scenario | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| View columns, cards, labels and participants | Yes | Yes | Yes, read-only |
| Create, edit, move and delete cards | Yes | Yes | No |
| Create, rename and delete columns | Yes | Yes | No |
| Create, edit and delete labels | Yes | Yes | No write controls |
| Invite, change roles and remove members | Yes | No | No |
| Leave a board | N/A for sole owner; otherwise per existing rules | Yes | Yes |
| Delete board | Yes | No | No |

The refactor must preserve the existing server-side and Firestore enforcement;
this table describes the UI capability contract only.

## Stable test selector contract

Prefer role, accessible name and label in new tests. The selectors below remain
stable across the structural refactor because current Cypress coverage relies
on them. A trigger may move into a Dialog or toolbar, but its `data-testid`
must remain available to the same user action.

| Area | Required selectors |
| --- | --- |
| Boards and invites | `create-board-trigger`, `create-board-title`, `create-board-submit`, `board-card`, `delete-board-trigger`, `delete-board-confirm`, `invite-card`, `accept-invite` |
| Board shell | `invite-member-trigger`, `new-column-title`, `create-column-submit`, `labels-section` |
| Labels | `new-label-name`, `new-label-color`, `create-label`, `label-row-*`, `delete-label-confirm`, `card-labels` |
| Columns and DnD | `column-*`, `column-drop-*`, `card-drag-overlay`, `add-card-*` |
| Card form | `card-*`, `new-card-title-*`, `new-card-description-*`, `new-card-due-*`, `new-card-labels-*`, `new-card-assignees-*`, `create-card-*`, `cancel-card-*`, `card-assignees` |
| Participants | `participant-role-*`, `invite-email`, `invite-submit` |

## Keyboard baseline

Tab order is recorded by interaction group rather than a brittle list of every
Radix popover option. Controls that are not rendered for a role are skipped.

1. Board header: back-to-boards → board language (when editable) → interface
   language → theme switcher.
2. Participants block: show/hide → invite trigger (owner) or leave-board
   trigger (non-owner) → new-column title → create-column submit (editor and
   owner).
3. Expanded participants: each editable role select → member removal controls
   → invite email → invite role → invite submit.
4. Labels: create-name → create-colour → create submit → each label's name,
   colour, save and delete controls.
5. Canvas: each column's edit/delete controls → cards in DOM order → add-card;
   an opened card form follows its title, description, due-date, assignees,
   labels, submit and cancel controls.

For every future Dialog: focus enters its first meaningful control, `Escape`
closes a cancellable dialog, and closing returns focus to the trigger. Keyboard
DnD remains available through the existing dnd-kit `KeyboardSensor`.

## Verification baseline

The phase is accepted only after the repository commands below pass on the
baseline commit. Results are updated in the implementation commit message and
its delivery note rather than being copied here, so this document remains a
description of the UI contract.

```text
npm run lint
npm run test:unit
npm run cypress:run
```
