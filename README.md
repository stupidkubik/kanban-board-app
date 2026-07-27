# Kanban Board App

Realtime kanban with Firebase Auth + Firestore, optimistic UI, and drag-and-drop.

## Project documentation

- [`docs/FUNCTIONAL_SPEC.md`](docs/FUNCTIONAL_SPEC.md) — complete as-is functional description and refactoring invariants.
- [`docs/PROJECT_AUDIT_2026-07-22.md`](docs/PROJECT_AUDIT_2026-07-22.md) — current-state audit, risks, optimization findings, and recommended work order.
- [`docs/DEPENDENCY_POLICY.md`](docs/DEPENDENCY_POLICY.md) — release dependency checklist and compatibility constraints.
- [`docs/OBSERVABILITY_AUDIT_2026-07-27.md`](docs/OBSERVABILITY_AUDIT_2026-07-27.md) — collected production evidence and the remaining authenticated console review.
- [`schema.md`](schema.md) — Firestore schema reference.
- [`BACKLOG.md`](BACKLOG.md) — earlier improvement ideas.

## Functionality
- Sign in with email/password or Google, plus password reset.
- Create/rename/delete boards and configure board language (ru/en).
- Invite members by email, switch accepted members between editor/viewer, and
  keep viewers read-only.
- Manage columns and cards (title, description, due date, multiple assignees)
  and drag cards between columns.
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
  ├─ /api/boards/[boardId]/members/[memberId] (role update, atomic remove/leave)
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
Requires Node.js 24.x. The major version is pinned so local development and
Vercel builds do not move to a new Node.js major automatically.

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
- The authenticated review in `docs/OBSERVABILITY_AUDIT_2026-07-27.md` confirms Vercel plus Firebase Console as the current monitoring baseline; do not add an external telemetry SDK without a concrete client-side diagnostic gap.

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
- `npm run smoke` - guarded production smoke (requires `SMOKE_ALLOW_WRITES=true`)
- `npm run migrate:stale-member-profiles` - dry-run cleanup audit for legacy member profiles
- `npm run test` - unit/component tests (Vitest)
- `npm run test:rules` - Firestore rules tests (emulator)
- `npm run cypress:open` - local Auth/Firestore emulators + Cypress UI runner
- `npm run cypress:run` - isolated local Auth/Firestore emulator E2E

## Testing

`npm run cypress:run` is self-contained: Firebase CLI starts Auth and Firestore
emulators under the non-routable demo project `demo-kanban-e2e`, the launcher starts
Next.js on port 3100, seeds a local Auth user, runs Cypress, and verifies that no
boards, invites, columns, cards, or member profiles remain. It does not read
Cypress credentials from `.env.local` and cannot write to the cloud Firebase
project.

Notes:
- `npm run test:rules` запускает Firestore emulator через `firebase emulators:exec`.
- E2E launcher disables App Check only inside the isolated emulator process.

The stale member profile migration uses the same Admin SDK credentials described
above and is read-only by default:

```bash
npm run migrate:stale-member-profiles
MIGRATION_APPLY=true npm run migrate:stale-member-profiles
```

Run the dry-run first and review the per-board counts. Apply mode deletes only
profiles that are still absent from the board membership when each transaction
commits; owner profiles are always protected. Re-run the dry-run after apply and
expect `staleProfilesFound: 0`. Migration output contains board ids and counts,
but no profile names or email addresses.

The production smoke is write-protected by default:

```bash
SMOKE_ALLOW_WRITES=true npm run smoke
```

It prints the selected project and synthetic `smoke-*` UID before writing,
creates one uniquely prefixed board with two columns, verifies list/order
queries, deletes all created data in `finally`, and independently verifies that
the board and columns no longer exist. A custom `SMOKE_TEST_UID` is accepted only
when it also uses the restricted `smoke-*` format.

## Notes
- Card order uses numeric gaps to avoid reindexing entire columns.
- Cards live under each board for board-level queries; the client groups by column.
- Firestore listeners keep multiple clients in sync in near-realtime.

## Backlog
See `BACKLOG.md` for future improvements with effort/benefit notes.
