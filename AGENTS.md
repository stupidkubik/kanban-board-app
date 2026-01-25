# AGENTS.md — Kanban Board App (instructions for coding agents)

This file is for coding agents (Codex, Cursor, etc.). Keep changes small, follow existing patterns, and verify changes with the repo scripts.

## Project summary
Realtime kanban with Firebase Auth + Firestore, optimistic UI, and drag-and-drop. (See README for the authoritative feature list.)

Key features:
- Sign in with email/password or Google + password reset
- Create/rename/delete boards and set board language (ru/en)
- Invite members by email with roles: owner / editor / viewer (viewer is read-only)
- Manage columns and cards (title, description, due date) and drag cards between columns
- Realtime sync via Firestore listeners with optimistic UI for create/move/delete
- UI locale stored per user in `users/{uid}` (ru/en)

## Tech stack
- Next.js (App Router) + React + TypeScript
- Redux Toolkit Query + Redux (cache, optimistic updates, UI state)
- Firebase Auth + Firestore (client SDK)
- Firebase Admin SDK (server API routes)
- dnd-kit
- shadcn/ui + Radix UI + CSS Modules

## Repo layout (high-level)
- app/                 Next.js routes (App Router)
- features/            feature modules (board, cards, columns, participants, boards, invites, home)
- components/          shared components
- components/ui/       shared UI primitives (Radix/shadcn)
- lib/                 Firebase, store, types, utils
- scripts/             utilities (e.g. smoke seed script)
- tests/               unit/component tests (Vitest)
- cypress/             E2E tests
- firestore.rules / firestore.indexes.json / firebase.json  Firebase config

## Server routes (important)
- /api/auth/session: session cookies
- /api/boards/[boardId]: Admin SDK delete of board + subcollections

## Data model (Firestore) — invariants to keep
- boards/{boardId}
- boards/{boardId}/columns/{columnId}
- boards/{boardId}/cards/{cardId}
  - cards store `columnId` + `order` (board-level cards; client groups by column)
- boardInvites/{boardId__email}
- boards/{boardId}/memberProfiles/{userId}
- users/{uid} (preferredLocale, email)

Notes:
- Card order uses numeric gaps to avoid reindexing entire columns.
- Firestore listeners keep multiple clients in sync near-realtime.

If you change the data model:
- Update `schema.md` accordingly.
- Re-check indexes and security rules impact.
- Add/adjust tests (rules + unit + E2E if relevant).

## Environment setup

### Required: `.env.local` (client Firebase config)
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

### Admin SDK credentials (server)
One of:
- FIREBASE_SERVICE_ACCOUNT = JSON string, OR
- FIREBASE_SERVICE_ACCOUNT_PATH = path to service account JSON

If neither is set, the app attempts `applicationDefault()` and a default file
`kanban-mvp-1baf2-firebase-adminsdk-fbsvc-ae0f47a077.json` in the project root.

### App Check (recommended)
- NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
- NEXT_PUBLIC_RECAPTCHA_SITE_KEY
- NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG=true
- FIREBASE_APPCHECK_ENFORCE=true

### Cypress E2E env
- CYPRESS_E2E_EMAIL
- CYPRESS_E2E_PASSWORD

## Commands (use repo scripts)
Install:
- npm install

Dev:
- npm run dev

Build / start:
- npm run build
- npm run start

Lint / auto-fix:
- npm run lint
- npm run format   (auto-fix lint issues)

Seed / smoke:
- npm run smoke    (see `scripts/smoke-kanban.mjs`)

Tests:
- npm run test         (Vitest)
- npm run test:rules   (Firestore rules tests via emulator; uses `firebase emulators:exec`)
- npm run cypress:open
- npm run cypress:run

## Guardrails (important)
- Never commit `.env.local`, service account JSON files, or any secrets.
- If you touch `firestore.rules`, you MUST run `npm run test:rules`.
- Preserve role constraints (owner/editor/viewer). Viewers must remain read-only.

## Working agreements
1) Follow feature module boundaries:
   - Prefer implementing UI + logic inside the relevant `features/<feature>/`.
   - Keep shared primitives in `components/ui` and shared utils/types in `lib/`.

2) Respect RTK Query + realtime design:
   - If you add/change Firestore listeners (`onSnapshot`), ensure you clean up subscriptions to avoid leaks.
   - If you modify optimistic updates, add a regression test or a clear reproducible scenario note.

3) Localization:
   - UI locale lives in `users/{uid}` (ru/en).
   - Board language is stored per board (ru/en).
   - Keep behavior consistent with existing UI.

4) Drag-and-drop:
   - If you modify DnD behavior, run Cypress (or add a minimal E2E) to cover moving cards between columns.

5) Keep changes small and verifiable:
   - Prefer minimal diffs.
   - Update README/schema.md when behavior or data model changes.
   - Run `npm run lint` + relevant tests before finalizing.

## When unsure
- Search for existing patterns in `features/` first and mirror them.
- Prefer leaving a TODO comment explaining uncertainty rather than inventing new conventions.
