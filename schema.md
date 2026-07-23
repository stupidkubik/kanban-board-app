# Firestore Data Model (Kanban)

This document describes the canonical Firestore schema used by the app.

## Conventions
- IDs use `...Id` suffix (`ownerId`, `invitedById`).
- Timestamps are stored as Firestore `Timestamp` values.
  - In the client, timestamps are normalized to milliseconds for Redux state.
- Access control is based on `roles` + `members`.

## Collections

### boards/{boardId}
Top-level document for each board.

Fields:
- `title` (string)
- `ownerId` (string, UID)
- `members` (map<string, bool>)
  - keys are `uid`, value `true`
- `roles` (map<string, "owner" | "editor" | "viewer">)
  - keys are `uid`
- `language` ("ru" | "en")
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp, optional)

Example:
```json
{
  "title": "Product launch",
  "ownerId": "uid_123",
  "members": {
    "uid_123": true,
    "uid_456": true
  },
  "roles": {
    "uid_123": "owner",
    "uid_456": "editor"
  },
  "language": "en",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

### boards/{boardId}/columns/{columnId}
Columns are stored as a subcollection of a board.

Fields:
- `title` (string)
- `order` (number) - position in the board
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp, optional)

Example:
```json
{
  "title": "In progress",
  "order": 2,
  "createdAt": "<timestamp>"
}
```

### boards/{boardId}/memberProfiles/{memberId}
Lightweight member profiles used for the board participants UI. Document id is the
user UID.

Fields:
- `displayName` (string | null)
- `photoURL` (string | null)
- `email` (string | null)
- `joinedAt` (Timestamp)

Example:
```json
{
  "displayName": "Alex",
  "photoURL": "https://lh3.googleusercontent.com/example",
  "email": "user@example.com",
  "joinedAt": "<timestamp>"
}
```

### boards/{boardId}/cards/{cardId}
Cards are stored in a board-level subcollection so we can query the entire board
once and group by `columnId` on the client. This scales better for large boards
than nesting cards under each column.

Fields:
- `columnId` (string)
- `title` (string)
- `description` (string, optional)
- `order` (number)
- `createdById` (string)
- `assigneeIds` (array<string>, optional)
- `labels` (array<string>, optional)
- `dueAt` (Timestamp, optional)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp, optional)
- `archived` (bool, optional)

`assigneeIds`, `labels`, and `archived` are reserved data-layer fields, not
finished UI features. Archived cards are excluded from the active kanban view.

Ordering notes:
- `order` is a numeric sort key. It is not required to be sequential.
- New positions are computed using gaps between neighbors (avg / +/- gap).
- Moving a card updates both `columnId` and `order`.
- If neighbors are missing, `order` uses the configured numeric gap.
- When the relative gap between neighbors falls to `1e-6` or lower, the client
  rebalances the target column in a batch (up to the supported 500-card cap).

Example:
```json
{
  "columnId": "col_todo",
  "title": "Fix auth redirect",
  "description": "Make sure session cookie is set",
  "order": 10,
  "createdById": "uid_123",
  "assigneeIds": ["uid_456"],
  "labels": ["bug", "auth"],
  "createdAt": "<timestamp>"
}
```

### boardInvites/{inviteId}
Pending invitations. Document id format: `boardId__email`.

Fields:
- `boardId` (string)
- `boardTitle` (string)
- `email` (string)
- `role` ("editor" | "viewer")
- `invitedById` (string, UID)
- `createdAt` (Timestamp)

Example:
```json
{
  "boardId": "board_abc",
  "boardTitle": "Product launch",
  "email": "user@example.com",
  "role": "editor",
  "invitedById": "uid_123",
  "createdAt": "<timestamp>"
}
```

### users/{uid}
User profile settings.

Fields:
- `email` (string | null)
- `preferredLocale` ("ru" | "en")
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

Example:
```json
{
  "email": "user@example.com",
  "preferredLocale": "en",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

## Query indexes
- Dynamic board membership and invite email queries use Firestore single-field indexes.
- `firestore.indexes.json` defines the cards `columnId ASC` + `order ASC` composite index.

## Migrations / backward compatibility
The app previously used some different field names. The client includes fallbacks
when reading, but new writes follow the canonical schema above.

Legacy fields and replacements:
- `createdBy` -> `ownerId` (boards)
- `invitedBy` -> `invitedById` (boardInvites)

If you want to clean legacy docs, run a one-time migration to rename the fields
and remove the legacy keys.

## Rules notes (columns/cards)
The current `firestore.rules` enforce these contracts:

- Allow read on `boards/{boardId}/columns/{columnId}` if user is a board member.
- Allow create/update on columns if user is owner/editor.
- Deny direct client deletion of columns. The owner deletes an empty column through
  the server API, which verifies ownership and card absence in one transaction.
- Allow read on `boards/{boardId}/memberProfiles/{memberId}` if user is a board member.
- Allow create/update on memberProfiles if user is writing their own profile doc.
- Deny direct client deletion of memberProfiles. Removing a member or leaving a board
  goes through the server API, which updates membership and deletes the profile in one transaction.

For cards:
- Allow read if user is a board member.
- Allow create/update if user is owner/editor.
- Allow delete if user is owner.
- Card `columnId` must reference an existing column; `createdById` must match the
  authenticated creator on create; assignees must be board members.
- Current limits: board/column titles 120 chars, card title 200, description 5000,
  up to 20 assignees, up to 10 labels of 50 chars, and up to 100 board members.

Implemented rule helpers include:
- `isBoardMember(boardId)` that loads `boards/{boardId}` and checks `members[uid]`.
- `isBoardEditor(boardId)` that checks `roles[uid] in ["owner", "editor"]`.
