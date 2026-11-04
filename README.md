# Kanban Board App

A production-ready collaborative kanban board for small teams. It combines
realtime Firestore synchronization, optimistic interactions, role-based access,
and drag-and-drop in a responsive bilingual interface.

[Live application](https://kanban-board-app-ten-psi.vercel.app/)

## Why this project matters

This project goes beyond a CRUD demo. It covers the difficult parts of a shared
workspace: concurrent updates, secure permissions, optimistic rollback,
cross-column ordering, server-side cascades, isolated end-to-end tests, and safe
production operations.

Key engineering outcomes:

- Near-realtime collaboration through lifecycle-safe Firestore listeners.
- Responsive optimistic card creation, movement, and deletion with rollback.
- Owner, editor, and viewer permissions enforced in the UI, API routes, and
  Firestore Rules.
- Numeric gap ordering and automatic rebalance without reindexing a column on
  every drag.
- Atomic board creation, invite acceptance, membership changes, and guarded
  destructive operations.
- Emulator-isolated Cypress flows that cannot write to the production Firebase
  project and verify their own cleanup.
- English and Russian UI, light/dark themes, keyboard-friendly controls, and a
  responsive board canvas.

## Product capabilities

- Email/password and Google sign-in, registration, password reset, and secure
  server session cookies.
- Create, rename, sort, and delete private boards.
- Invite teammates as editors or read-only viewers and update accepted roles.
- Create and manage columns and cards with descriptions and due dates.
- Assign up to 20 board members and 10 shared labels to a card.
- Move cards within or between columns using pointer or keyboard drag-and-drop.
- Manage a board-level label catalog with realtime rename and color updates.
- Recover selected destructive actions through time-limited Undo notifications.
- Switch personal interface language and theme independently from board
  language.

## Architecture

```text
Next.js App Router
├── React UI + Radix primitives + CSS Modules
├── dnd-kit pointer and keyboard interactions
├── Redux Toolkit Query
│   ├── Firestore onSnapshot subscriptions
│   └── optimistic cache patches and rollback
├── Firebase Auth client
└── Next.js API routes
    ├── verified session cookies
    ├── Firebase Admin transactions
    └── cascade and membership operations

Firebase
├── Authentication
├── Firestore data and realtime listeners
└── Firestore Security Rules
```

The codebase follows feature boundaries:

```text
app/             routes, layouts, and server API handlers
features/        board, cards, columns, participants, labels, invites, home
components/ui/   shared accessible UI primitives
lib/             Firebase setup, store, types, i18n, and utilities
tests/           Vitest unit, component, and Firestore Rules tests
cypress/         critical user journeys
scripts/         smoke checks, migrations, and E2E orchestration
```

## Technical highlights

### Realtime and optimistic state

RTK Query owns Firestore subscriptions and cleans them up with cache lifecycle
hooks. Mutations patch every relevant cache immediately and restore prior state
when a write fails. This keeps interactions fast without hiding persistence
errors.

### Ordering and drag-and-drop

Cards live in one board-level collection and are grouped by `columnId` on the
client. Their numeric `order` uses gaps between neighbours, so a normal move
updates one card. When gaps become too small, the target column is rebalanced in
a bounded batch.

### Security model

The browser is never the security boundary. Firestore Rules repeat role and data
shape checks, while sensitive membership, catalog, and cascade operations use
authenticated server routes backed by Firebase Admin transactions. Viewer access
remains read-only across all layers.

### Release safety

Production builds use Webpack and include a server-trace check that rejects
credential files. Cypress runs against local Auth and Firestore emulators under
a non-routable demo project. Production smoke writes require an explicit opt-in
and remove all synthetic data in `finally`.

## Stack

- Next.js 16, React 19, TypeScript
- Redux Toolkit and RTK Query
- Firebase Authentication, Firestore, and Firebase Admin SDK
- dnd-kit
- Radix UI, shadcn-style primitives, CSS Modules
- Vitest, Testing Library, Firebase Rules Unit Testing, Cypress
- Vercel

## Quality checks

The current automated baseline contains:

- 128 unit and component tests (Vitest project `unit`) with a V8 coverage
  floor of 45% statements and lines, 38% branches, 47% functions.
- 12 Firestore Rules scenarios (Vitest project `rules`, emulator only) covering
  owner/editor/viewer access and data invariants.
- 3 full Cypress journeys covering core CRUD, Undo, drag-and-drop, invitations,
  labels, assignees, role changes, realtime updates, and cleanup.
- A production build check for secret-free Next.js server traces.

GitHub Actions (`.github/workflows/quality.yml`) runs `npm run check` (ESLint with
zero warnings, TypeScript, Vitest) and `npm run build` on every pull request and
push to `main`, plus a separate production-dependency audit.

Run the release-oriented checks locally:

```bash
npm run check
npm run test:rules
npm run build
npm run cypress:run
```

## Run locally

Requirements: Node.js 24.x and a Firebase web application.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill the public Firebase values in `.env.local`:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Server routes additionally require one Admin SDK credential source:

- `FIREBASE_SERVICE_ACCOUNT` in protected hosting environment variables;
- managed Application Default Credentials; or
- `GOOGLE_APPLICATION_CREDENTIALS` pointing outside the repository.

Never store a service-account file or `.env.local` in Git.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build with Webpack and inspect server traces |
| `npm run check` | Lint (zero warnings), Prettier check, typecheck, unit tests with coverage thresholds |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code and config with Prettier |
| `npm run typecheck` | Type-check the app, tests, and Cypress specs |
| `npm run test` | Run every Vitest project once (rules tests skip without the emulator) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:unit` | Run unit and component tests once |
| `npm run test:coverage` | Unit tests with V8 coverage (report in `coverage/`) |
| `npm run test:rules` | Test Firestore Rules in the emulator |
| `npm run cypress:run` | Run isolated Auth/Firestore E2E |
| `npm run smoke` | Run the guarded production smoke script |
| `npm run migrate:stale-member-profiles` | Audit stale profiles in dry-run mode |
| `npm run migrate:card-labels` | Audit legacy card labels in dry-run mode |

See [operations](docs/OPERATIONS.md) before a release, migration, or production
smoke run.

## Documentation

- [Functional specification](docs/FUNCTIONAL_SPEC.md) — current product
  behaviour, permissions, limits, and invariants.
- [Operations](docs/OPERATIONS.md) — release, security, migration,
  observability, and rollback procedures.
- [Firestore schema](schema.md) — canonical collections, fields, ordering, and
  compatibility notes.
- [UI patterns](docs/UI_PATTERNS.md) — reusable interaction and accessibility
  conventions.
- [Development history](docs/DEVELOPMENT_HISTORY.md) — completed audit and
  refactoring decisions.
- [Backlog](BACKLOG.md) — deliberately deferred product and engineering work.

## Portfolio summary

Short version suitable for a résumé or project card:

> Built and deployed a realtime collaborative kanban application with Next.js,
> TypeScript, Redux Toolkit, and Firebase. Implemented optimistic updates,
> role-based access across UI/API/Firestore Rules, keyboard-accessible
> drag-and-drop, shared labels and assignees, emulator-isolated E2E tests, and
> production safety checks.

Impact-oriented bullet points:

- Designed a realtime client architecture with deterministic listener cleanup
  and optimistic rollback for responsive multi-user workflows.
- Secured owner/editor/viewer permissions across three enforcement layers and
  moved sensitive mutations into atomic server transactions.
- Built a bounded card-ordering model that avoids full-column rewrites during
  normal drag-and-drop.
- Created a repeatable release gate spanning unit, component, security-rules,
  end-to-end, build-trace, migration, and production smoke checks.
