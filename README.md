# Kanban Board App

Realtime kanban with Firebase Auth + Firestore, optimistic UI, and drag-and-drop.

## Functionality
- Sign in with email/password or Google, plus password reset.
- Create/rename/delete boards and set a board language (ru/en).
- Invite members by email with roles (owner/editor/viewer); viewers are read-only.
- Manage columns and cards (title, description, due date) and drag cards between columns.
- Realtime sync via Firestore listeners with optimistic UI for create/move/delete.
- UI language stored per user in `users/{uid}` (ru/en).

## Tech Stack
- Next.js (App Router) + React 19 + TypeScript
- Redux Toolkit Query + Redux (cache, optimistic updates, UI state)
- Firebase Auth + Firestore (client SDK)
- Firebase Admin SDK (server API routes)
- dnd-kit for drag-and-drop
- shadcn/ui + Radix UI + CSS Modules

## Architecture
```text
Browser (Next.js App Router)
  ├─ UI (shadcn/ui + dnd-kit)
  ├─ Redux Toolkit Query cache
  │   ├─ Firestore listeners (onSnapshot)
  │   └─ Optimistic patches (create/move/delete cards)
  └─ Firebase Auth (client SDK)
        │
        ├─ Firestore (boards/columns/cards/memberProfiles/users)
        └─ boardInvites

Server (Next.js API routes)
  ├─ /api/auth/session (session cookies)
  └─ /api/boards/[boardId] (Admin SDK delete of board + subcollections)
```

## Data Model (Firestore)
- `boards/{boardId}`
- `boards/{boardId}/columns/{columnId}`
- `boards/{boardId}/cards/{cardId}` with `columnId` + `order` (board-level cards)
- `boardInvites/{boardId__email}`
- `boards/{boardId}/memberProfiles/{userId}`
- `users/{uid}` (preferredLocale, email)

See `schema.md` for more details.

## Getting Started
Install dependencies:
```bash
npm install
```

Run the dev server:
```bash
npm run dev
```

## Environment
Create `.env.local` with client Firebase config:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Admin SDK credentials (server):
- `FIREBASE_SERVICE_ACCOUNT` = JSON string, or
- `FIREBASE_SERVICE_ACCOUNT_PATH` = path to service account JSON

If neither is set, the app attempts `applicationDefault()` and a default file
`kanban-mvp-1baf2-firebase-adminsdk-fbsvc-ae0f47a077.json` in the project root.

App Check (recommended):
```
NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY=...
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG=true
FIREBASE_APPCHECK_ENFORCE=true
```

## Scripts
- `npm run dev` - local dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint
- `npm run smoke` - seed data (see `scripts/smoke-kanban.mjs`)
- `npm run test` - unit/component tests (Vitest)
- `npm run test:rules` - Firestore rules tests (emulator)
- `npm run cypress:open` - Cypress UI runner
- `npm run cypress:run` - Cypress headless run

## Testing
Environment for Cypress:
```
CYPRESS_E2E_EMAIL=...
CYPRESS_E2E_PASSWORD=...
```

Notes:
- `npm run test:rules` запускает Firestore emulator через `firebase emulators:exec`.
- E2E тесты предполагают, что App Check отключен локально либо настроен debug-токен.

## Notes
- Card order uses numeric gaps to avoid reindexing entire columns.
- Cards live under each board for board-level queries; the client groups by column.
- Firestore listeners keep multiple clients in sync in near-realtime.
