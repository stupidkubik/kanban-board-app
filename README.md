# Kanban Board App

Realtime kanban with Firebase Auth + Firestore, optimistic UI, and drag-and-drop.

## Project documentation

- [`docs/FUNCTIONAL_SPEC.md`](docs/FUNCTIONAL_SPEC.md) — complete as-is functional description and refactoring invariants.
- [`docs/PROJECT_AUDIT_2026-07-22.md`](docs/PROJECT_AUDIT_2026-07-22.md) — current-state audit, risks, optimization findings, and recommended work order.
- [`schema.md`](schema.md) — Firestore schema reference.
- [`BACKLOG.md`](BACKLOG.md) — earlier improvement ideas.

## Functionality
- Sign in with email/password or Google, plus password reset.
- Create/rename/delete boards and configure board language (ru/en).
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
  ├─ /api/boards (atomic board + owner profile creation)
  ├─ /api/boards/[boardId] (access check, rename, cascade delete)
  ├─ /api/boards/[boardId]/columns/[columnId] (safe empty-column delete)
  ├─ /api/boards/[boardId]/members/[memberId] (atomic remove/leave)
  └─ /api/invites/[inviteId]/accept (atomic invite acceptance)
```

## Codebase Analysis (quick)
- **Feature modules are cleanly separated** (`features/*`), with shared primitives in `components/ui` and shared utilities in `lib/`.
- **Realtime flow**: RTK Query subscribes to Firestore `onSnapshot` and feeds cached data to UI, while optimistic updates keep interactions responsive.
- **Ordering model**: cards use numeric `order` gaps to avoid mass reindexing; client groups cards by `columnId` for column rendering.
- **UI state**: per-board UI drafts (new/edit card, etc.) live in Redux, keeping forms predictable across renders.
- **DnD**: `dnd-kit` handles card moves; drag overlay is separate to avoid layout shifts.
- **Localization**: UI locale is stored per user in `users/{uid}`; board language is separate editable board metadata.

## Feature Modules
```text
features/
  board/        board page shell + status
  cards/        card data, model hooks, UI
  columns/      columns model + UI
  participants/ participants model + UI
  boards/       boards list + board card
  invites/      invite list/accept/decline
  home/         home page shell
```
Shared layers:
```text
lib/            Firebase, store, types, utils
components/ui   shared UI primitives (Radix/shadcn)
app/            Next.js routes
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
Requires Node.js 22.12 or newer (required by Firebase Admin SDK 14 and its ESM dependencies).

Install dependencies:
```bash
npm install
```

Run the dev server:
```bash
npm run dev
```

## Environment
Create `.env.local` with client Firebase config (start from `.env.example`):
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Admin SDK credentials (server):
- On the target Vercel deployment, set `FIREBASE_SERVICE_ACCOUNT` to a JSON string in the protected environment-variable store.
- On a platform with managed identity, Application Default Credentials may be used instead.
- For local ADC, `GOOGLE_APPLICATION_CREDENTIALS` may point to a credential file outside the repository.

The app never searches for credential files inside the project. Do not place service-account JSON in the repository or deployment bundle.

Production deployment:
- Target platform: Vercel — https://kanban-board-app-ten-psi.vercel.app/
- Store `FIREBASE_SERVICE_ACCOUNT` only as a protected Vercel environment variable; never commit or bundle a credential file.
- Production builds explicitly use Webpack. `firebase-admin` stays on the compatible 13.x line because 14.x currently produces a Vercel runtime `ERR_REQUIRE_ESM` through `jwks-rsa@4 -> jose@6`.
- Treat upgrading Firebase Admin to 14.x as a separate compatibility migration: deploy a preview, verify `/` and protected API routes, and inspect runtime logs before promoting it.
- Observability decision is pending verification: confirm available runtime errors, latency, retention, and alerts in Vercel, plus Firestore usage/quota and billing alerts in Firebase Console, before adding or rejecting an external telemetry SDK.

App Check (recommended):
```
NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY=...
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG=true
FIREBASE_APPCHECK_ENFORCE=true
```

## Scripts
- `npm run dev` - local dev server
- `npm run build` - production build plus server-trace secret check
- `npm run check:server-trace` - verify existing Next.js NFT manifests contain no project credential files
- `npm run start` - run production server
- `npm run lint` - lint
- `npm run format` - auto-fix lint issues
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
CYPRESS_E2E_ALLOW_WRITES=true
```

Direct E2E uses the currently configured Firebase project; a separate test project
is not required for this pet project. The suite refuses to write without the
explicit flag, uses dedicated E2E credentials, and removes every board it creates
in `afterEach`.

Notes:
- `npm run test:rules` запускает Firestore emulator через `firebase emulators:exec`.
- E2E тесты предполагают, что App Check отключен локально либо настроен debug-токен.

## Notes
- Card order uses numeric gaps to avoid reindexing entire columns.
- Cards live under each board for board-level queries; the client groups by column.
- Firestore listeners keep multiple clients in sync in near-realtime.

## Backlog
See `BACKLOG.md` for future improvements with effort/benefit notes.
