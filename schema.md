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
- `archived` (bool, optional)

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
- `archived` (bool, optional)

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
  "photoURL": "https://example.com/avatar.png",
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

## Suggested indexes
- `boards` where `members.{uid} == true`
- `boardInvites` where `email == <email>`
- `boards/{boardId}/cards` where `columnId` + `order`

## Migrations / backward compatibility
The app previously used some different field names. The client includes fallbacks
when reading, but new writes follow the canonical schema above.

Legacy fields and replacements:
- `createdBy` -> `ownerId` (boards)
- `invitedBy` -> `invitedById` (boardInvites)

If you want to clean legacy docs, run a one-time migration to rename the fields
and remove the legacy keys.

## Rules notes (columns/cards)
Recommended extensions to `firestore.rules` once columns/cards are implemented:

- Allow read on `boards/{boardId}/columns/{columnId}` if user is a board member.
- Allow create/update on columns if user is owner/editor.
- Allow delete on columns if user is owner.
- Allow read on `boards/{boardId}/memberProfiles/{memberId}` if user is a board member.
- Allow create/update on memberProfiles if user is writing their own profile doc.

For cards:
- Allow read if user is a board member.
- Allow create/update if user is owner/editor.
- Allow delete if user is owner.

Suggested rule helpers:
- `isMember(boardId)` that loads `boards/{boardId}` and checks `members[uid]`.
- `isEditor(boardId)` that checks `roles[uid] in ["owner", "editor"]`.
