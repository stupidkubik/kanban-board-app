# Kanban Board App

Realtime kanban with Firebase Auth + Firestore, optimistic UI, and drag-and-drop.

## Features
- Boards, columns, and cards with ordering.
- Realtime updates via Firestore listeners.
- Optimistic updates on drag-and-drop.
- Board invites and roles (owner/editor/viewer).
- UI built with shadcn/ui components.

## Tech Stack
- Next.js (App Router)
- React + Redux Toolkit Query
- Firebase Auth + Firestore
- dnd-kit for drag-and-drop

## Architecture
```text
Browser (Next.js App Router)
  ├─ UI (shadcn/ui + dnd-kit)
  ├─ Redux Toolkit Query
  │   ├─ Firestore listeners (onSnapshot)
  │   └─ Optimistic updates (local cache patches)
  └─ Firebase Auth (client)
        │
        ├─ Firestore (boards/columns/cards)
        └─ boardInvites + memberProfiles

Server (Next.js API routes)
  ├─ Firebase Admin SDK
  └─ Session cookies (Auth)
```

## Data Model (Firestore)
- `boards/{boardId}`
- `boards/{boardId}/columns/{columnId}`
- `boards/{boardId}/cards/{cardId}` with `columnId` + `order`
- `boardInvites/{boardId__email}`
- `boards/{boardId}/memberProfiles/{userId}`

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

## Scripts
- `npm run dev` - local dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint
- `npm run smoke` - seed data (see `scripts/smoke-kanban.mjs`)

## Notes
- Card order uses numeric gaps to avoid reindexing entire columns.
- Firestore listeners keep multiple clients in sync in near-realtime.
