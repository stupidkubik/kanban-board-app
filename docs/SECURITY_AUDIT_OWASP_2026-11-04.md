# Kanban Board App — OWASP Top 10:2025 security audit (2026-11-04)

| | |
| --- | --- |
| Date | 2026-11-04 |
| Target | `stupidkubik/kanban-board-app`, commit `be82b2e` on `main` (working tree clean except untracked `docs/maintenance/`, out of scope) |
| Scope | `app/api/**` (Next.js 16 App Router route handlers), `app/(app)/layout.tsx`, `app/(auth)/sign-in/*`, `lib/firebase/*`, `lib/server/*`, `lib/errors.ts`, `lib/validation.ts`, `lib/permissions.ts`, `lib/store/*`, `features/**/data`, `features/labels/server/*`, `firestore.rules`, `next.config.ts`, `scripts/*.mjs`, `.gitignore`, `.env.example`, `package.json` / `package-lock.json`, `docs/OPERATIONS.md` (deployment facts only) |
| Framework | OWASP Top 10:2025, all ten categories |
| Method | Static review only. No project code, tests, package-manager commands, scanners or network calls were executed. Resolved dependency versions were read from `package-lock.json` and installed `node_modules` metadata (read-only). `.env.local` was inspected for key names only; no values were read or reproduced. |
| Deployed environment | Vercel (Hobby) + Firebase project `kanban-mvp-1baf2` per `docs/OPERATIONS.md`. Vercel environment variables, Firebase console settings (App Check enforcement, password policy, email-enumeration protection) and the live HTTP headers were **not** available and are listed as limitations. |
| Prior work | `docs/UPGRADE_AND_REVIEW_PLAN_2026-11-04.md` §4.1 (S1–S17). Section 6 of this report merges the two lists. |

Reading order for the owner: §1 summary → §6 cross-reference (one merged list) → §3 findings for evidence → §7 priorities.

---

## 1. Summary

**Overall risk: Medium.** The application has a sound authorization skeleton: every Admin-SDK route verifies the Firebase session cookie (`checkRevoked=true`), then checks board membership/role server-side; Firestore rules deny by default, pin ownership fields, and enforce size/shape limits on every client-writable document; no SQL, shell, template or `eval` boundaries exist; React escaping is never bypassed; the image optimizer is host-restricted. The remaining issues are concentrated in three places: **identity binding of invitations** (an unverified e-mail claim is enough to join a board), **input validation in the Admin routes** (which bypass the rules' limits and, through unvalidated document ids, let any user write documents into any path under `boards/`), and **operational hardening** (session revocation, App Check fail-open, logging, CSP).

Nothing found allows an unauthenticated attacker to read or modify data. The highest-impact path requires an attacker to register the invitee's e-mail address before the real invitee does.

### Counts

| Severity | Count | IDs |
| --- | --- | --- |
| Critical | 0 | — |
| High | 1 | A07-001 |
| Medium | 7 | A02-002, A05-001, A05-002, A06-001, A07-002, A10-002, A10-003 |
| Low | 11 | A01-001, A01-002, A02-001, A06-002, A06-003, A06-004, A07-003, A08-001, A09-001, A09-002, A10-001 |
| Informational | 8 | A01-003, A01-004, A02-003, A02-004, A02-005, A03-001, A06-005, A10-004 |

| Confidence | Count | Notes |
| --- | --- | --- |
| High | 18 | reachable path and missing control traced in code |
| Medium | 7 | A02-004, A02-005, A03-001, A06-001, A06-003, A10-002, A10-003 — a deployment or runtime fact is unavailable |
| Low | 2 | A02-002, A07-003 — `[MANUAL VERIFICATION REQUIRED]` |

### Main risks (in priority order)

1. **A07-001** Invitation acceptance keys on `email` without `email_verified`; sign-up never sends a verification mail. Whoever registers an invited address first gets the invite.
2. **A05-001** `boardId` (JSON body and URL segment) is passed straight to `collection("boards").doc(...)`; the Admin SDK splits on `/`, so `victimBoard/cards/x` creates a document inside another user's board. Writes only, invisible in the UI, but cross-tenant and permanent.
3. **A05-002** Admin routes do not enforce the size/type limits that the rules enforce on clients (title, displayName, photoURL, members ≤ 100), so the server path can produce documents the client path can no longer update.
4. **A10-002 / A07-002 / A10-003** App Check silently disabled when the site-key variable is absent; no server-side session revocation on logout; non-atomic board cascade delete plus client-chosen board ids.
5. **A06-001** Any user can push unlimited invitations (and board creations) at any e-mail address; the invitee's client loads them with an unbounded listener.

### Not assessed / partially assessed

A03 (no vulnerability database query; prior Dependabot triage in the plan §2 was not re-verified), A09 (Vercel/Firebase log pipelines not visible), deployed HTTP headers, Firebase console settings. See §4 and §8.

### Execution-context classification

| Area | Context | Basis |
| --- | --- | --- |
| `app/api/**/route.ts`, `lib/firebase/admin.ts`, `app-check.ts`, `session.ts`, `lib/server/rate-limit.ts`, `features/labels/server/*`, `app/(app)/layout.tsx` | Server (Vercel Node.js function) | route handlers, `import "server-only"`, `next/headers` |
| `lib/firebase/client.ts`, `app-check-fetch.ts`, `retry-write.ts`, `lib/store/*`, `features/**/data/*`, `app/(auth)/sign-in/*`, `components/*` | Browser | `"use client"`, `import "client-only"`, Firebase Web SDK |
| `firestore.rules` | Firestore rules engine (enforced only for Web-SDK traffic; Admin SDK bypasses rules) | `firebase.json` |
| `next.config.ts` | Build/server (header injection) | Next config |
| `scripts/*.mjs` | Operator-run Node scripts with Admin credentials | `package.json` scripts, `docs/OPERATIONS.md` |

---

## 2. Architecture facts the findings rely on

- Two write paths exist for board data: (a) browser → Firestore Web SDK, governed by `firestore.rules`; (b) browser → `/api/**` → Admin SDK, which **bypasses rules** and relies solely on the route's own checks. Cards, columns, invites (create/decline) and `boards.language` use path (a); board create/rename/delete, labels, member removal/role change, invite accept and the session cookie use path (b).
- Session: Firebase ID token → `POST /api/auth/session` → `adminAuth.createSessionCookie` (5 days) → cookie `session` (`HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`). Every route and the `(app)` layout call `verifySessionCookie(cookie, true)`.
- App Check: client attaches `X-Firebase-AppCheck` when a site key is configured; server verifies only when `FIREBASE_APPCHECK_ENFORCE === "true"` or (production **and** a site-key variable is set). `docs/OPERATIONS.md` states App Check enforcement is **off** on the Firebase side for Auth and Firestore.
- Rate limiting: in-memory fixed window on `globalThis`, applied only to `POST /api/auth/session`.
- No `middleware.ts`/`proxy.ts`; no CORS headers are emitted (same-origin only); no CI workflow in the repository; `package-lock.json` v3 present, all 1 418 resolved packages from `registry.npmjs.org`.

---

## 3. Findings

Severity = impact × exploitability if real. Confidence = strength of evidence. IDs restart per category.

### A01:2025 Broken Access Control

Object-level authorization was traced for every route and rule. All resource routes verify membership or ownership against the board document inside the transaction (or immediately before it) and all Firestore matches deny by default. No IDOR, forced browsing, privilege-escalation or SSRF path was found. The findings below are defense-in-depth gaps and information leaks.

#### OWASP-A01-001 — Mutating routes rely on `SameSite=Lax` alone against CSRF

- **CWE:** [CWE-352](https://cwe.mitre.org/data/definitions/352.html) Cross-Site Request Forgery — **Severity: Low** — the cookie is set with an explicit `SameSite=Lax`, which blocks cookie attachment on cross-site non-navigation requests in all current browsers, and the production host `*.vercel.app` is on the Public Suffix List, so no sibling site is "same-site". **Confidence: High** (code) / the custom-domain situation is unknown.
- **Where:** `lib/firebase/session.ts:16-22` (cookie attributes); every handler in `app/api/**` reads only the cookie; no `Origin`/`Sec-Fetch-Site` check anywhere; `DELETE /api/auth/session` (`app/api/auth/session/route.ts:46-54`) requires no proof of intent at all.
- **Entry point / path:** attacker page → cross-site `fetch`/form → `/api/boards/{id}` (`DELETE`) with victim cookie. Blocked today by `Lax`; additionally, when App Check is enforced, the required `X-Firebase-AppCheck` header makes the request non-simple and the attacker cannot mint a token for this site key.
- **Impact if the single control fails** (browser without SameSite support, future same-site subdomain, or a cookie attribute regression): deletion/rename of boards, role changes, logout.
- **Fix:** in a shared `authorizeRequest()` helper reject state-changing requests whose `Origin` (or, when absent, `Sec-Fetch-Site`) is not the app origin; keep `SameSite=Lax`; require the App Check header independently of the fail-open switch (see A10-002). Cheap and covers all 11 handlers. [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- Links: [A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/). Plan: **S5 (CSRF part) partially confirmed, severity lowered to Low.**

#### OWASP-A01-002 — Existence oracles for board, card and invite documents

- **CWE:** [CWE-200](https://cwe.mitre.org/data/definitions/200.html) Exposure of Sensitive Information to an Unauthorized Actor — **Severity: Low** — any authenticated user can confirm whether an arbitrary document id exists; ids are 20-char random strings, so blind enumeration is impractical, but a former member knows the ids. **Confidence: High.**
- **Where:**
  - `app/api/boards/[boardId]/route.ts:50-56` — `GET` returns `404` for a missing board and `403` for an existing board the caller is not a member of.
  - `app/api/boards/route.ts:47-60,82-84` — `POST` answers `409 Board ID conflict` when `boardId` exists and is not the caller's, `200` otherwise (and, with A05-001, this probes any path under `boards/`, including other users' card ids).
  - `app/api/invites/[inviteId]/accept/route.ts:63-65,83-85` — `404 Board not found` vs `404 Invite not found` distinguishes board existence before the invite/email check.
- **Fix:** return `404` for both "missing" and "not a member" on `GET`; generate `boardId` server-side (removes the `409`); in the accept route check the invite first and answer with one generic `404`.
- Plan: **S11 confirmed and extended** (the `GET` and accept-route oracles are new).

#### OWASP-A01-003 — Rules let editors rewrite board timestamps; dead rule functions; invite e-mail unformatted

- **CWE:** [CWE-284](https://cwe.mitre.org/data/definitions/284.html) Improper Access Control — **Severity: Informational** — only presentation order (`createdAt`) and audit fields of a board the editor already edits are affected. **Confidence: High.**
- **Where:** `firestore.rules:215-235` — both update branches pin `ownerId`, `title`, `members`, `roles`, label catalog, but not `createdAt`/`updatedAt`/`language` (language is intended). `firestore.rules:149-199` — `inviteDoc`, `hasInvite`, `inviteRole`, `inviteDocMatches`, `canAcceptInvite`, `canLeaveBoard` are never referenced by any `match`. `firestore.rules:486-490` — invite `email` is only length-checked; the client lowercases (`use-board-participants.ts:127`) but the rule does not require it, and `isInvitee()` compares case-sensitively (`firestore.rules:458-462`) while the API compares case-insensitively (`accept/route.ts:80`).
- **Fix:** add `request.resource.data.createdAt == resource.data.createdAt` to the update branches; delete the six dead functions (they are the only place the rules mention `request.auth.token.email` for membership and are a trap for future edits); require `email == email.lower()` and a basic `matches()` pattern on invite create.
- Plan: **S13 confirmed.**

#### OWASP-A01-004 — Client permission helper grants `editor` to members without an explicit role

- **CWE:** none assigned (UI-only inconsistency) — **Severity: Informational** — server routes and rules both require an explicit role (`roles[uid] in ["owner","editor"]`), so this cannot bypass anything; it only shows controls the backend will refuse. **Confidence: High.**
- **Where:** `lib/permissions.ts:19-23`.
- Plan: **S12 confirmed.**

### A02:2025 Security Misconfiguration

#### OWASP-A02-001 — CSP permits inline scripts; `img-src https:` is a wildcard

- **CWE:** none (hardening observation; no XSS sink exists to amplify) — **Severity: Low** — with `script-src 'unsafe-inline'` the policy would not stop a future injected script; `img-src https:` allows image beacons to any host. `frame-src https://*.firebaseapp.com` is broader than the single `authDomain` needed. **Confidence: High** for the configured value; the effective header on the live site was not fetched.
- **Where:** `next.config.ts:5,8,10`; `tests/unit/security-headers.test.ts:12-14` pins `'unsafe-inline'` as expected behaviour.
- **Context:** Next.js App Router injects inline bootstrap scripts, so dropping `'unsafe-inline'` requires a nonce (`'nonce-…' 'strict-dynamic'`) generated in a `proxy.ts`/middleware per request. Other headers are good: `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- **Fix:** nonce-based CSP via middleware; narrow `img-src` to `'self' data: blob: https://lh3.googleusercontent.com`; narrow `frame-src` to the project's `authDomain` host.
- Plan: **S9 confirmed** (severity Low here because no injection sink was found; Medium in the plan).

#### OWASP-A02-002 — App Check debug token exposed through a `NEXT_PUBLIC_` variable `[MANUAL VERIFICATION REQUIRED]`

- **CWE:** [CWE-526](https://cwe.mitre.org/data/definitions/526.html) Cleartext Storage of Sensitive Information in an Environment Variable — **Severity: Medium** — a registered App Check debug token lets anyone mint valid App Check tokens for the project, nullifying App Check for the API routes and, once enforcement is turned on in Firebase, for Auth/Firestore too. **Confidence: Low** — the value exists in the developer's local `.env.local` (key name only was inspected) and is referenced from a client module; whether it is also set in the Vercel production/preview environment is unknown.
- **Where:** `lib/firebase/client.ts:56,65-73` reads `process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG`. Next.js inlines every referenced `NEXT_PUBLIC_*` variable into the browser bundle at **build** time; the surrounding `NODE_ENV !== "production"` guard only decides whether the value is *used*, not whether it is *shipped*. `.env.local` (git-ignored) defines the key; `.env.example:20` documents it.
- **Path:** Vercel build with the variable set → value embedded in `_next/static/chunks/*.js` → anyone downloads the bundle → `FIREBASE_APPCHECK_DEBUG_TOKEN = <token>` in their own page → `getToken()` returns valid App Check tokens.
- **Verification:** in the Vercel dashboard confirm the variable is unset for Production and Preview; alternatively grep a production chunk for `APP_CHECK_DEBUG` (a network fetch, so outside this static audit).
- **Fix:** do not store the token in an env var at all. Set `globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true` in development only, copy the token Firebase prints to the console once into the Firebase App Check console, and keep it in a developer's keychain. If an env var must stay, drop the `NEXT_PUBLIC_` prefix and read it in a server component. Rotate (delete) the currently registered debug token in the Firebase console regardless.
- Links: [A02:2025](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/). Plan: **new.**

#### OWASP-A02-003 — `.gitignore` names the real service-account file; `measurementId` hard-coded

- **CWE:** none (metadata disclosure; no secret value) — **Severity: Informational.** `.gitignore:26` reveals the service-account file name including the key id (`…-ae0f47a077.json`); git history (`git log --all --diff-filter=A`) shows the file itself was never committed, only `.env.example`. `lib/firebase/config.ts:8` embeds the Analytics `measurementId`, which is public by design (ships in the bundle anyway). **Confidence: High.**
- **Fix:** replace the literal with the pattern `*firebase-adminsdk*.json` (already covered by `scripts/check-server-trace.mjs:38`); move `measurementId` to `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` for consistency. Plan: **S15 (gitignore/measurementId part) confirmed.**

#### OWASP-A02-004 — HSTS not emitted by the application

- **CWE:** none — **Severity: Informational** — Vercel adds `Strict-Transport-Security: max-age=63072000` to all deployments on its platform, so the live site is expected to be covered. **Confidence: Medium** (platform documentation, not verified against the live host). **Fix:** add the header explicitly in `next.config.ts` so the guarantee survives a hosting move; verify with `curl -sI https://<prod-host>/sign-in | grep -i strict`. Plan: **S9 (HSTS part) confirmed.**

#### OWASP-A02-005 — Emulator mode switched by env presence without a production guard

- **CWE:** none (misconfiguration lead) — **Severity: Informational** — if `FIRESTORE_EMULATOR_HOST` or `FIREBASE_AUTH_EMULATOR_HOST` leaked into the Vercel environment, the Admin SDK would initialise without credentials and route traffic to a non-existent emulator (fail-closed: every route would 500). The client has the guard (`lib/firebase/client.ts:42-44`); the server does not. **Confidence: Medium.**
- **Where:** `lib/firebase/admin.ts:28-45`. **Fix:** throw when `NODE_ENV === "production"` and an emulator host is set; validate required env at module load. Plan: **S17 (emulator part) confirmed.**

### A03:2025 Software Supply Chain Failures

#### OWASP-A03-001 — Supply-chain posture: lockfile good, governance manual, vulnerability data not re-checked

- **CWE:** none assigned (process observation) — **Severity: Informational.** **Confidence: Medium.**
- **Evidence (read-only):** `package-lock.json` lockfileVersion 3, 1 419 entries, every `resolved` URL on `registry.npmjs.org`, no git/URL dependencies, no `.npmrc`. Direct dependencies with install scripts: only `cypress` (`postinstall`, devDependency). Resolved production versions: `next 16.3.4`, `react 19.2.3`, `firebase 12.16.0`, `firebase-admin 13.10.0`, `@grpc/grpc-js 1.9.16` (an old minor line pulled by `firebase-admin 13.x`; `docs/OPERATIONS.md:94-96` documents 13.x as a deliberate pin because 14.x breaks Vercel Functions). No `.github/workflows` exist, so no CI audit gate; Dependabot is active (merged PRs #15–#17 in history); `npm audit --omit=dev` is a manual step in the release runbook (`docs/OPERATIONS.md:52,85`).
- **Not done:** no advisory database was queried (would require network access). The plan's §2 triage of 61 Dependabot alerts is therefore neither confirmed nor disputed here.
- **Fix:** add a minimal GitHub Actions workflow with `permissions: contents: read`, `npm ci`, `npm audit --omit=dev --audit-level=high`, `npm run lint`, `npm run test:unit`; keep Dependabot grouped updates; generate an SBOM (`npm sbom --sbom-format=cyclonedx`) as a build artifact. Record the `firebase-admin 13.x` pin as an accepted risk with a review date. [OWASP Software Supply Chain Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html)

### A04:2025 Cryptographic Failures

**Assessed, no findings.** The application implements no cryptography of its own: session cookies and ID tokens are signed and verified by Firebase (`createSessionCookie`/`verifySessionCookie`), App Check tokens by `firebase-admin/app-check`. `Math.random()` (`features/notifications/ui/notifications-provider.tsx:23`) and SHA-256 (`scripts/migrate-card-labels-logic.mjs:20,37`) are used for non-security identifiers only. The Firebase Web API key is public by design. TLS and HSTS are the platform's (A02-004). The `JSON.parse` `cause` leak of key material belongs to logging (A09-002).

### A05:2025 Injection

No SQL, OS-command, template, `eval`, header or DOM-HTML sink exists. All Firestore access uses the SDK's structured API; `FieldPath` is used for the member query (`lib/store/firestore-normalizers.ts:122`). No `dangerouslySetInnerHTML`, `innerHTML`, `href={}`, `window.open` or `document.write` in `app/`, `components/`, `features/`, `lib/`. User strings (titles, names, e-mails) are rendered through React text nodes/attributes only. `next/image` is restricted to `lh3.googleusercontent.com` (`next.config.ts:22-30`), so the server-side optimizer cannot be pointed at arbitrary hosts (no SSRF).

#### OWASP-A05-001 — Firestore document-path injection through `boardId` (body and URL)

- **CWE:** [CWE-74](https://cwe.mitre.org/data/definitions/74.html) Improper Neutralization of Special Elements in Output Used by a Downstream Component — **Severity: Medium** — any authenticated user can create attacker-controlled documents at arbitrary paths beneath `boards/`, including inside other users' boards, and probe the existence of arbitrary documents; no existing document can be overwritten and the injected documents are not shown by the UI. **Confidence: High** — SDK behaviour verified in `node_modules/@google-cloud/firestore@7.11.6/build/src/reference/collection-reference.js:179-191` (`doc()` calls `ResourcePath.append()`, which splits the argument on `/`; the only rejections are empty strings, `//`, and an odd segment count) and `next/dist/shared/lib/router/utils/route-matcher.js:17-21` (dynamic params are `decodeURIComponent`-decoded, so `%2F` arrives as `/`).
- **Where:**
  - `app/api/boards/route.ts:37,42-43` — `body.boardId` only checked for truthiness, then `adminDb.collection("boards").doc(body.boardId)` and `boardRef.collection("memberProfiles").doc(session.uid)`; `transaction.create(...)` writes `{ title, ownerId, members, roles, language, createdAt, updatedAt }` (`:63-71`) and a profile document (`:72-77`).
  - `app/api/boards/[boardId]/route.ts:49,92,170`, `.../labels/route.ts:32`, `.../labels/[labelId]/route.ts:47-48,95`, `.../members/[memberId]/route.ts:42-43,174`, `.../columns/[columnId]/route.ts:47-48`, `app/api/invites/[inviteId]/accept/route.ts:52-54` — path segments passed unvalidated to `.doc()`.
- **Source → sink:** `POST /api/boards` with JSON `{"boardId":"<victimBoardId>/cards/<newId>","title":"…","language":"en"}` → `boardRef = boards/<victim>/cards/<newId>` → transaction reads it (does not exist) → `transaction.create` writes the board-shaped document **inside the victim's `cards` sub-collection** and `boards/<victim>/cards/<newId>/memberProfiles/<attacker>` beneath it. Any `title` string of any length (no limit, see A05-002) is accepted. The victim's listeners (`lib/store/firestore-listeners.ts:101-104,124-127,150-153,180-187`) all `orderBy` a field the injected document lacks (`order`/`joinedAt`), so it is invisible; the victim's cascade delete (`[boardId]/route.ts:182-190`) removes the first level but not the nested `memberProfiles` document, which becomes a permanent orphan. Sending an existing card id returns `409` (A01-002), confirming it exists. The same `boardId` with an odd number of segments (e.g. `a/b`) throws inside the SDK and surfaces as `500` with the SDK message (A10-001).
- **Why existing controls do not block it:** rules are bypassed by the Admin SDK; the ownership check happens *after* the path is built and only against the document at the injected path; the `404 Board not found` branches do not prevent the create path.
- **Impact:** cross-tenant integrity pollution and storage consumption inside other users' boards, unrecoverable from the UI; document-existence oracle under any `boards/**` path; consistent with the plan's `"a/b" → 500` observation but strictly stronger.
- **Fix:** validate every id segment server-side with one helper before building any reference: `/^[A-Za-z0-9_-]{1,64}$/` for `boardId`, `columnId`, `labelId`, `memberId` (Firebase uids), and `/^[A-Za-z0-9_-]{1,64}__[^\s/]{3,320}$/` for `inviteId`; reject anything else with `400`. Generate `boardId` on the server (`boardRef = collection("boards").doc()`), which also closes A01-002/A10-003. Add a unit test that `POST /api/boards` with `boardId: "x/cards/y"` returns `400`. [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- Links: [A05:2025](https://owasp.org/Top10/2025/A05_2025-Injection/). Plan: **new** (S2 mentions the `500` symptom; the cross-board write is not in the plan).

#### OWASP-A05-002 — Admin routes skip the shape/size limits that the rules enforce

- **CWE:** [CWE-20](https://cwe.mitre.org/data/definitions/20.html) Improper Input Validation — **Severity: Medium** — any authenticated user can store up to ~1 MiB per document (Firestore limit) that every board member then downloads on each snapshot, and can produce board documents the client path can no longer update. **Confidence: High.**
- **Where / what is missing:**
  - `app/api/boards/route.ts:36-39,63-77` — `title` has no length cap (rules: ≤ 120, `firestore.rules:67-71`); `displayName`, `photoURL`, `email` are stored with no `typeof`/length check (rules: string ≤ 120 / ≤ 2048 / ≤ 320, `firestore.rules:441-456`); objects and arrays are accepted as-is.
  - `app/api/invites/[inviteId]/accept/route.ts:92-105` — same profile fields; `members`/`roles` grow without the ≤ 100 cap (`firestore.rules:128-138`). After member 101 every client update of that board (`updateBoardLanguage`, `lib/store/firestore-operations.ts:159-164`) fails `membersValid()`.
  - `app/api/boards/[boardId]/route.ts:82-89` — rename `title` unbounded; a title > 120 chars makes every subsequent client-side board update fail `boardTitleValid()` and every invite creation fail `inviteBoardTitleValid()` (`firestore.rules:492-496`).
  - `app/api/auth/session/route.ts:31-32` — `idToken` not checked to be a string before `createSessionCookie` (folded into A07-002).
- **Rendering note (dispute of an implicit risk):** `photoURL` is rendered through `next/image` (`features/participants/ui/participants-section-view.tsx:74-80,194`). In `next@16.3.4` the host/format validation of `defaultLoader` runs only when `NODE_ENV !== "production"` (`node_modules/next/dist/shared/lib/image-loader.js:62-101`); in production the optimizer endpoint answers `400 "url" parameter is not allowed` (`node_modules/next/dist/server/image-optimizer.js:574-598`). A hostile `photoURL` therefore yields a broken avatar, **not** a page crash. In `next dev` it would throw into the route error boundary.
- **Fix:** one shared validator (zod or hand-written) used by all routes: `title` string 1–120, `displayName` string ≤ 120 | null, `photoURL` `https:` URL ≤ 2048 | null, `email` ≤ 320 | null, `language` enum, unknown keys rejected; enforce `Object.keys(members).length < 100` inside the accept transaction; cap request body size (`request.json()` after checking `Content-Length` ≤ 16 KiB).
- Plan: **S2 confirmed, severity lowered from High to Medium** (the damage is confined to boards the attacker owns or has been invited to, and the `photoURL` vector cannot crash production).

### A06:2025 Insecure Design

#### OWASP-A06-001 — Unlimited invitation and board creation; unbounded invite listener on the victim side

- **CWE:** [CWE-799](https://cwe.mitre.org/data/definitions/799.html) Improper Control of Interaction Frequency — **Severity: Medium** — any authenticated user can target any e-mail address with an unbounded number of invitation documents; the target's home page downloads all of them on every load. Cost to the attacker is zero on Firebase Spark; the only per-request limiter is on the session route. **Confidence: Medium** — the path is fully traced; the practical threshold at which the client becomes unusable was not measured.
- **Where:**
  - `firestore.rules:511-523` — invite create requires only that the caller owns *some* board; `email` is any string ≤ 320; the id is `${boardId}__${email}`, so one invite per (board, e-mail), but boards are unlimited (`app/api/boards/route.ts` has no per-user cap or limiter; `lib/server/rate-limit.ts` is only wired into the session route).
  - `lib/store/firestore-listeners.ts:74-94` — `subscribeToInvites` has no `limit()` (every other listener caps at 100/500).
  - `features/invites/ui/invites-section.tsx:68-99` — renders all invites, declined one by one (`declineBoardInvite`, one delete each).
  - Side effect: the attacker chooses the `boardTitle` (≤ 120 chars, must equal the board's title) shown to the victim — a free text channel for phishing-style messages inside the app.
- **Fix:** per-user board cap (e.g. 50) enforced in `POST /api/boards` inside the transaction (count or a counter doc); per-owner pending-invite cap in rules via a counter document or move invite creation to the API with a limiter; `limit(100)` on the invite listener plus a "decline all" action; optional: only allow inviting addresses that already have an account (`adminAuth.getUserByEmail`) — this also removes the unverified-email problem's second half.
- Links: [A06:2025](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/), [OWASP Business Logic Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html). Plan: **new** (S6 notes missing limits generically; the targeted-victim flooding and the unbounded listener are not in the plan).

#### OWASP-A06-002 — Two-phase label / member cleanup leaves a validation gap editors can fall into

- **CWE:** [CWE-362](https://cwe.mitre.org/data/definitions/362.html) Race Condition — **Severity: Low** — window is one network round-trip between the card batch and the catalog transaction; the consequence (every card update on the board rejected by `cardLabelIdsValid`/`cardAssigneesValid`) persists until an editor re-saves the affected card without the stale id, and the client does not self-heal (`buildCardUpdates`, `features/cards/data/card-operations.ts:53-84`, passes `labelIds` unfiltered). **Confidence: High.**
- **Where:** `app/api/boards/[boardId]/labels/[labelId]/route.ts:100-142`; `app/api/boards/[boardId]/members/[memberId]/route.ts:63-116`; `firestore.rules:386-401,564-579` validate `labelIds`/`assigneeIds` on every update, not only when they change.
- **Fix:** in rules, validate those arrays only when `affectedKeys().hasAny(["labelIds","assigneeIds"])`; on the client filter by `allowedIds` before every write (the helpers already accept an `allowedIds` set). Plan: **S7 confirmed, severity lowered to Low.**

#### OWASP-A06-003 — Rate limiter is per-instance and covers one route

- **CWE:** [CWE-799](https://cwe.mitre.org/data/definitions/799.html) — **Severity: Low** — on Vercel each function instance has its own `Map`, so the 10/min limit on `POST /api/auth/session` is nominal; the eviction rule (`lib/server/rate-limit.ts:26-32`) drops arbitrary entries once 10 000 keys exist. Brute force of credentials is Firebase Auth's responsibility (identitytoolkit, not this route), so the practical exposure is low. **Confidence: Medium** on the Vercel instance model.
- **Where:** `lib/server/rate-limit.ts:51-57`; `app/api/auth/session/route.ts:8-11`. The key is the first `x-forwarded-for` entry; Vercel documents that it sets this header itself, so spoofing applies only off-platform.
- **Fix:** Vercel WAF rate-limit rules or an Upstash/Firestore counter; apply to board/label/invite creation too. Plan: **S6 confirmed.**

#### OWASP-A06-004 — `cardColumnValid` checks column existence outside the delete transaction

- **CWE:** [CWE-362](https://cwe.mitre.org/data/definitions/362.html) — **Severity: Low** — a card can land in a column deleted a moment earlier; it becomes an invisible orphan counted against the 500-card cap. **Confidence: High.** **Where:** `firestore.rules:354-358`; `app/api/boards/[boardId]/columns/[columnId]/route.ts:49-82`. **Fix:** accept, plus periodic orphan sweep (extend `migrate-stale-member-profiles` pattern), or soft-delete columns. Plan: **S14 confirmed.**

#### OWASP-A06-005 — Operator scripts: no target-project guard; smoke writes bypass rules and schema

- **CWE:** none assigned (operational design) — **Severity: Informational** — scripts run only by the operator with Admin credentials. **Confidence: High.**
- **Where:** `scripts/migrate-card-labels.mjs:18-22`, `scripts/migrate-stale-member-profiles.mjs:30-34`, `scripts/smoke-kanban.mjs:27-28` derive the project from whatever `.env.local` points to, with no `EXPECTED_PROJECT_ID` assertion; `migrate-card-labels.mjs:47-115` applies per-board batches outside a transaction and aborts the whole run on the first board with > 500 cards (`:53-55`); `smoke-kanban.mjs:102-108,141-153` writes `createdAt`/`updatedAt` into `memberProfiles` and `dueDate` into cards — fields the rules would reject — so the smoke does not exercise the production write path. Both migrations are dry-run by default (`MIGRATION_APPLY=true` required) and the smoke requires `SMOKE_ALLOW_WRITES=true`, which is good.
- **Fix:** assert the resolved project id equals an explicit env (`EXPECTED_PROJECT_ID`), continue past per-board errors with a summary, run the smoke through the public API/Web SDK with a test user. Plan: **S16 confirmed.**

### A07:2025 Authentication Failures

#### OWASP-A07-001 — Board invitations are accepted on an unverified e-mail claim

- **CWE:** [CWE-287](https://cwe.mitre.org/data/definitions/287.html) Improper Authentication — **Severity: High** — any Internet user who can register an e-mail/password account for an invited address before its real owner does obtains `editor` (or `viewer`) access to the inviting board and can read every pending invitation (board titles, inviter ids) for that address. Firebase e-mail/password sign-up does not verify addresses, and the application never calls `sendEmailVerification`. **Confidence: High** — full path traced; preconditions are that the target address has no Firebase account yet and that the attacker learns or guesses that an invitation exists.
- **Where:**
  - `app/(auth)/sign-in/use-email-auth-controller.ts:63-67` — `createUserWithEmailAndPassword` with no verification mail.
  - `app/api/invites/[inviteId]/accept/route.ts:80-82` — authorization is `invite.email.toLowerCase() === session.email.toLowerCase()`; `session.email_verified` is never read.
  - `firestore.rules:458-462` — `isInvitee()` is `request.auth.token.email == resource.data.email`; `email_verified` is never referenced anywhere in the rules; it gates invite `read` (`:524`) and `delete` (`:525`), so the attacker can also silently decline invites meant for the victim.
  - `lib/store/firestore-listeners.ts:79-82` — the invite list query is by e-mail only.
- **Source → sink:** attacker signs up as `victim@example.com` (unverified) → `POST /api/auth/session` → cookie with `email` claim → `GET` invites via Web SDK (rule passes) → `POST /api/invites/{boardId}__victim@example.com/accept` → added to `members`/`roles` → full board read, card edit as editor.
- **Why visible controls do not block it:** Firebase "one account per e-mail" prevents the real victim from later registering with a password, but does not stop the attacker from registering first; Google sign-in by the victim later links/replaces the provider, by which time the invite is consumed.
- **Fix (server + rules + client):** in the accept route require `session.email_verified === true || session.firebase.sign_in_provider === "google.com"`; in rules change `isInvitee()` to also require `request.auth.token.email_verified == true`; after sign-up call `sendEmailVerification` and block invite UI until verified (`user.emailVerified`); consider inviting by account existence (A06-001 fix). Add tests: unverified session → `403`; rules test for `email_verified == false` → denied. [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Links: [A07:2025](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/). Plan: **S1 confirmed (High).**

#### OWASP-A07-002 — Session lifecycle: no revocation on logout, 5-day cookie, no `__Host-` prefix, unhandled cookie-creation errors

- **CWE:** [CWE-613](https://cwe.mitre.org/data/definitions/613.html) Insufficient Session Expiration — **Severity: Medium** — a session cookie copied from a device (malware, shared machine, backup) stays valid for up to 5 days after the user logs out, because `DELETE /api/auth/session` only clears the browser cookie. `getSession` already passes `checkRevoked=true` (`lib/firebase/session.ts:44`), so a server-side `revokeRefreshTokens(uid)` on logout would take effect immediately. **Confidence: High.**
- **Where:** `app/api/auth/session/route.ts:46-54` (logout); `lib/firebase/session.ts:8,16-22` (`SESSION_EXPIRES_IN_MS` = 5 d, cookie name `session`, `secure` only when `NODE_ENV === "production"`); `app/api/auth/session/route.ts:31-41` (`idToken` not type-checked; `createSessionCookie` not wrapped → an invalid/expired token produces an unhandled `500` instead of `401`, and Next logs the exception).
- **Fix:** on `DELETE`, verify the cookie, call `adminAuth.revokeRefreshTokens(decoded.sub)`, then clear; rename the cookie to `__Host-session` (requires `Secure`, `Path=/`, no `Domain` — already the case in production); shorten to 24 h with silent re-issue from the client (the client already re-syncs every 6 h, `lib/firebase/app-check-fetch.ts:10`); wrap `createSessionCookie` in `try/catch → 401`; require `typeof idToken === "string"`. Note the trade-off: `revokeRefreshTokens` logs the user out on all devices. [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Plan: **S4 confirmed.**

#### OWASP-A07-003 — Password policy and enumeration depend on Firebase console settings `[MANUAL VERIFICATION REQUIRED]`

- **CWE:** [CWE-521](https://cwe.mitre.org/data/definitions/521.html) Weak Password Requirements — **Severity: Low** — the client accepts 6-character passwords (`app/(auth)/sign-in/use-email-auth-controller.ts:14`), no compromised-password check and no MFA exist, and `getFriendlyAuthError` maps `auth/user-not-found`, `auth/wrong-password`, `auth/email-already-in-use` to distinct messages (`app/(auth)/sign-in/auth-error.ts:17-24`), which enumerates accounts unless Firebase's *Email enumeration protection* is on (then Firebase returns `auth/invalid-credential` uniformly). Brute-force throttling is Firebase's (`auth/too-many-requests` is handled). **Confidence: Low** — the effective policy lives in the Firebase console, not in the repository.
- **Fix:** enable the Firebase Auth password policy (min 12–15, enforce on sign-up) and *Email enumeration protection* in the console; raise `MIN_PASSWORD_LENGTH` to match; collapse `userNotFound`/`wrongPassword`/`emailAlreadyInUse` into one message in the UI. Plan: **new.**

### A08:2025 Software or Data Integrity Failures

No native deserialization (`JSON.parse` only on request bodies and operator env), no webhooks, no auto-update or remote code loading, no `npm install` from unpinned sources (A03-001). Request bodies are bound field-by-field, never spread into documents (`app/api/boards/route.ts:63-77`, `accept/route.ts:100-105`), so no mass assignment.

#### OWASP-A08-001 — Members may self-assert any `email` in their board profile

- **CWE:** [CWE-345](https://cwe.mitre.org/data/definitions/345.html) Insufficient Verification of Data Authenticity — **Severity: Low** — a member can display themselves under another person's e-mail in the participants list of a board they already belong to (social-engineering inside the board); no privilege follows from the field. The client never writes this path (profiles are created by the API with `session.email`), but the rule allows it. **Confidence: High.**
- **Where:** `firestore.rules:590-596` (`create, update` allowed for `request.auth.uid == memberId` with any `email` ≤ 320); the API also falls back to `body.email` only when the session has no e-mail claim (`app/api/boards/route.ts:74`, `accept/route.ts:102`).
- **Fix:** `allow create, update: if false` for `memberProfiles` (server-only, matching labels), or require `request.resource.data.email == request.auth.token.email`. Plan: **S10 confirmed, severity lowered to Low.**

### A09:2025 Security Logging and Alerting Failures

#### OWASP-A09-001 — API routes emit no server-side security or error logs

- **CWE:** [CWE-778](https://cwe.mitre.org/data/definitions/778.html) Insufficient Logging — **Severity: Low** — on this data set (board titles, member e-mails) the detection gap is bounded, but today a `500` is only ever seen by the *client* (the message is returned, nothing is written server-side), and 401/403/409 decisions leave no application trace, so the probing in A01-002/A05-001 and the failures in A05-002 are invisible except as status codes in Vercel's access log (Hobby plan: short retention, no alerts, `docs/OPERATIONS.md:180`). **Confidence: High.**
- **Where:** every `catch` in `app/api/**` returns `NextResponse.json({ error: message }, { status: 500 })` without `console.error`; `verifyAppCheckToken` (`lib/firebase/app-check.ts:36-38`) and `getSession` (`lib/firebase/session.ts:45-47`) swallow the reason; the only structured log is the browser-side `reportClientError` (`lib/client/report-error.ts:13-20`), which never leaves the user's console.
- **Fix:** in the shared `authorizeRequest()`/error helper, `console.error(JSON.stringify({ event, route, uid, boardId, status, correlationId, error: message }))` for every 401/403/409/500 (Vercel captures stdout as structured logs); return only `{ error: "Internal error", correlationId }` to the client (A10-001). [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- Links: [A09:2025](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/). Plan: **new** (S3 proposes a correlation id for the client; the absence of any server log is not stated).

#### OWASP-A09-002 — Service-account JSON fragments can reach logs on a parse failure

- **CWE:** [CWE-532](https://cwe.mitre.org/data/definitions/532.html) Insertion of Sensitive Information into Log File — **Severity: Low** — only on a malformed `FIREBASE_SERVICE_ACCOUNT`; V8's `SyntaxError` message (Node ≥ 20) quotes a slice of the input, which can include part of `private_key`. **Confidence: High.**
- **Where:** `lib/firebase/admin.ts:17-19` attaches the `SyntaxError` as `cause` (printed by Vercel's error logging); `scripts/migrate-card-labels.mjs:17` parses unguarded; `migrate-stale-member-profiles.mjs:21-27` and `smoke-kanban.mjs:33-39` handle it correctly.
- **Fix:** catch and rethrow without `cause`; never log the raw error. Rotate the key if such a log line ever appears. Plan: **S15 (JSON.parse part) confirmed.**

### A10:2025 Mishandling of Exceptional Conditions

#### OWASP-A10-001 — Raw SDK error messages returned in `500` responses

- **CWE:** [CWE-209](https://cwe.mitre.org/data/definitions/209.html) Generation of Error Message Containing Sensitive Information — **Severity: Low** — messages are single-line Firestore/Admin SDK strings (resource paths echoing the caller's own input, gRPC status names such as `ALREADY_EXISTS`, argument-validation text), not stack traces; reconnaissance value is small. **Confidence: High.**
- **Where:** `lib/errors.ts:1-2` returns `error.message` for any `Error`; used in every `catch` in `app/api/**` (e.g. `app/api/boards/route.ts:85-86`, `[boardId]/route.ts:59-60,145-146,194-195`).
- **Fix:** generic message + correlation id to the client; detail to the server log (A09-001). [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html). Plan: **S3 confirmed, severity lowered to Low.**

#### OWASP-A10-002 — App Check verification fails open when the site-key variable is absent

- **CWE:** [CWE-636](https://cwe.mitre.org/data/definitions/636.html) Not Failing Securely — **Severity: Medium** — a missing/renamed `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`/`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in the Vercel environment silently removes the bot/abuse barrier and the incidental CSRF defense from all routes, with no log line. The security consequence is bounded because session authentication is independent. **Confidence: Medium** — the production value of these variables is unknown; `docs/OPERATIONS.md:35-38` confirms Firebase-side enforcement is intentionally off.
- **Where:** `lib/firebase/app-check.ts:9-25`.
- **Fix:** fail closed in production unless `FIREBASE_APPCHECK_ENFORCE === "false"` is set explicitly; validate the trio of variables at startup and log the effective mode once. Plan: **S5 (App Check part) confirmed.**

#### OWASP-A10-003 — Board cascade delete is non-atomic and client-chosen ids allow re-creation over orphans

- **CWE:** [CWE-460](https://cwe.mitre.org/data/definitions/460.html) Improper Cleanup on Thrown Exception — **Severity: Medium** — the board document is deleted *last* (`app/api/boards/[boardId]/route.ts:182-190`), so during the (up to several seconds for large boards) cascade, editors can still create columns/cards that survive as orphans; a failure mid-way returns `500` with children partially deleted and the board still present. Because `POST /api/boards` accepts a client `boardId` and `transaction.create` succeeds whenever the document is absent (`app/api/boards/route.ts:42-71`), **any** authenticated user who knows the old id (every former member does) can re-create the board under their ownership and thereby gain read access to any orphaned cards/columns left under that path — an authorization consequence of the cleanup flaw ([CWE-639](https://cwe.mitre.org/data/definitions/639.html) impact, reported here once). **Confidence: Medium** — orphans exist only after a race or a partial failure; both are plausible but were not reproduced.
- **Fix:** delete the board document **first** inside a transaction (rules then deny all child writes because `boardExists()` fails), then cascade; make the cascade recursive (`adminDb.recursiveDelete(boardRef)` in `firebase-admin ≥ 10` handles nested sub-collections, including the ones A05-001 can create); generate ids server-side. Plan: **S8 confirmed.**

#### OWASP-A10-004 — Label catalog lookups on a plain object collide with `Object.prototype` keys

- **CWE:** [CWE-754](https://cwe.mitre.org/data/definitions/754.html) Improper Check for Unusual or Exceptional Conditions — **Severity: Informational** — a label named `constructor`, `toString`, `hasOwnProperty`, `__proto__`, etc. can never be created or renamed to: `labelNames[normalizedName]` is truthy via the prototype, so the route answers `409 Label name already exists` (`app/api/boards/[boardId]/labels/route.ts:40-42`, `.../labels/[labelId]/route.ts:60-63`). No write of `__proto__` reaches Firestore (the assignment is a no-op on a plain object), so there is no pollution; this is a correctness bug with a security-adjacent root cause. **Confidence: High.**
- **Where:** `features/labels/server/label-route-helpers.ts:56-65` builds `labelIds`/`labelNames` with object spread.
- **Fix:** use `Object.create(null)` or `Map` for the catalog maps, and `Object.hasOwn` for lookups. Plan: **new.**

---

## 4. Coverage

| Category | Status | Basis / what was not assessable |
| --- | --- | --- |
| A01 Broken Access Control | Assessed | all 11 handlers, `(app)/layout.tsx`, every `match` in `firestore.rules`, client call sites. No CORS config exists (same-origin). |
| A02 Security Misconfiguration | Partially assessed | `next.config.ts`, cookies, env handling, `.gitignore`, git history. **Not assessable:** live HTTP headers, Vercel env vars, Firebase console (App Check enforcement, Auth settings), Vercel build command. |
| A03 Supply Chain | Partially assessed | lockfile integrity/sources, install scripts, pins, runbook. **Not assessable:** CVE status (no network), Vercel's install command, Dependabot configuration file (lives outside the checkout). |
| A04 Cryptographic Failures | Assessed | no custom crypto; Firebase-managed tokens; TLS/HSTS platform-managed (unverified). |
| A05 Injection | Assessed | all server sinks, all React render sites in `features/**/ui` and `components/**` grep-verified; rules path functions. |
| A06 Insecure Design | Assessed | business flows: create/invite/accept/leave/remove/delete/labels/columns; operator scripts. Load behaviour not measured. |
| A07 Authentication Failures | Partially assessed | sign-in/up/reset controllers, session routes, claims. **Not assessable:** Firebase password policy, enumeration protection, MFA, authorized domains. |
| A08 Integrity Failures | Assessed | no deserialization/webhooks; explicit field binding; lockfile. |
| A09 Logging & Alerting | Partially assessed | application code only. **Not assessable:** Vercel log retention/alerts, Firebase audit logs. |
| A10 Exceptional Conditions | Assessed | every `try/catch` in server code, transactions, cleanup paths, fail-open switches. |

---

## 5. Verified and in order (do not re-audit)

- Every Admin route: App Check → session (`checkRevoked`) → params → membership/role check inside the transaction; viewers cannot mutate; owners cannot be demoted/removed; `role` body value allow-listed (`members/[memberId]/route.ts:166-171`); label body allow-listed (`label-route-helpers.ts:23-39`).
- Rules: `ownerId`, `createdById`, `members`/`roles` immutability by non-server paths; `membersRolesInSync`; `labels` and column `delete` server-only; `users/{uid}` self-only; catch-all deny.
- Cookie flags `HttpOnly`/`Secure`/`SameSite=Lax`; no token in URLs or `localStorage` (only a sync timestamp and uid, `app-check-fetch.ts:24-33`); client re-auths on `401`.
- No open redirect (`redirect("/sign-in")` and `router.replace("/")` are constants); no `next=` parameter.
- `scripts/check-server-trace.mjs` blocks credential files from server traces; the service-account file and `.env*` were never committed.
- `next/image` host allow-list prevents optimizer SSRF; no `unoptimized`/custom loader.
- Emulator connection is production-guarded on the client; E2E runner uses the demo project and emulators only.

---

## 6. Cross-reference with `docs/UPGRADE_AND_REVIEW_PLAN_2026-11-04.md` §4.1

Status legend: **Confirmed** = same root cause, same or close severity; **Confirmed ↓/↑** = confirmed, severity changed by this audit (reason in the finding); **Partial** = part confirmed, part disputed; **Extended** = confirmed plus new facts.

| Plan | Plan severity | Audit ID(s) | Audit severity | Status | Note |
| --- | --- | --- | --- | --- | --- |
| S1 | HIGH | A07-001 | High | Confirmed | Rules `isInvitee()` also gates invite *delete* — attacker can silently decline the victim's invites. |
| S2 | HIGH | A05-002 (+ A05-001) | Medium (+ Medium) | Partial / Extended | Validation gaps confirmed; severity lowered (blast radius = boards the attacker already belongs to; `photoURL` cannot crash production). The `"a/b" → 500` symptom is the visible edge of A05-001, a cross-board document write not in the plan. |
| S3 | MEDIUM | A10-001 | Low | Confirmed ↓ | One-line SDK messages, no stack traces. Pair with A09-001 (new): the detail is currently *only* sent to the client, never logged. |
| S4 | MEDIUM | A07-002 | Medium | Confirmed | `checkRevoked=true` is already in place, so `revokeRefreshTokens` on logout is a one-line effective fix. |
| S5 | MEDIUM | A01-001, A10-002 | Low, Medium | Partial | App Check fail-open confirmed (Medium). CSRF lowered to Low: explicit `SameSite=Lax` plus the PSL-listed `vercel.app` host block the cross-site case today; Origin check remains recommended as the second layer. |
| S6 | MEDIUM | A06-003, A06-001 | Low, Medium | Extended | Per-instance limiter confirmed (Low). The absence of creation limits becomes Medium when combined with the unbounded invite listener: a targeted invite flood against one e-mail address (A06-001, new). |
| S7 | MEDIUM | A06-002 | Low | Confirmed ↓ | Window is one round-trip and needs a concurrent editor; impact is reversible by re-saving the card. |
| S8 | MEDIUM | A10-003 | Medium | Confirmed | Use `recursiveDelete`; it also cleans nested documents A05-001 can plant. |
| S9 | MEDIUM | A02-001, A02-004 | Low, Informational | Confirmed ↓ | No injection sink found, so CSP is defense in depth; HSTS is platform-provided (unverified live). |
| S10 | MEDIUM | A08-001 | Low | Confirmed ↓ | Display-only spoof inside a board the user already belongs to. |
| S11 | LOW | A01-002 | Low | Extended | Two further oracles: `GET /api/boards/{id}` 404-vs-403 and the accept route's "Board not found" ordering. |
| S12 | LOW | A01-004 | Informational | Confirmed | UI-only. |
| S13 | LOW | A01-003 | Informational | Confirmed | Also: rules compare invite e-mail case-sensitively, API case-insensitively. |
| S14 | LOW | A06-004 | Low | Confirmed | — |
| S15 | LOW | A09-002, A02-003 | Low, Informational | Confirmed | File never committed (git history checked). |
| S16 | LOW | A06-005 | Informational | Confirmed | Dry-run/opt-in gates already present. |
| S17 | IMPROVEMENT | A02-005 (+ A01-001, A09-001) | Informational | Confirmed | The `authorizeRequest()` helper the plan proposes is the natural home for Origin check, id validation, and structured logging. |

### Findings added by this audit (not in the plan)

| ID | Severity | One line |
| --- | --- | --- |
| **A05-001** | Medium | `boardId` from body/URL is split on `/` by the Admin SDK → any user writes documents inside any other user's board path; existence oracle on arbitrary paths. |
| **A02-002** | Medium (Low confidence) | App Check debug token under a `NEXT_PUBLIC_` variable is embedded in the browser bundle if set at build time; verify Vercel env, rotate the registered token. |
| **A06-001** | Medium | Unlimited boards/invites + unbounded invite listener → targeted flooding of any e-mail address; attacker-chosen text (board title) shown to the victim. |
| **A09-001** | Low | API routes log nothing server-side; 500 details go to the client only. |
| **A07-003** | Low (Low confidence) | 6-char passwords, distinct enumeration messages, no MFA — effective policy depends on Firebase console settings. |
| **A10-004** | Informational | Label names equal to `Object.prototype` keys are unusable (`409`). |
| A01-002 ext. | Low | Additional existence oracles (`GET` board, accept route). |

### Plan items disputed or narrowed

- **S2 (High → Medium):** cross-user harm limited to boards the attacker is already in; the `next/image` path cannot throw in production.
- **S3, S7, S9, S10 (Medium → Low):** reasons in the respective findings.
- **S5 CSRF (Medium → Low):** explicit `SameSite=Lax`, PSL host; keep the Origin check as planned but it is not urgent on its own.
- No plan item was found to be incorrect.

---

## 7. Prioritised remediation

**Quick wins (High/Medium with low effort):**

1. **A07-001** — `email_verified` check in `accept/route.ts` (3 lines) + rules `isInvitee()` (1 line) + `sendEmailVerification` after sign-up. Tests: unverified → 403; rules test.
2. **A05-001 + A05-002 + A01-002 + A10-003 (id part)** — one `validateIds()`/`validateBoardBody()` helper, server-generated `boardId`, used by all 11 handlers. Test: `boardId: "x/cards/y"` → 400.
3. **A07-002** — `revokeRefreshTokens` on logout, `try/catch → 401`, `__Host-` prefix.
4. **A10-002** — fail-closed App Check in production unless explicitly disabled; **A02-002** — remove the debug token from `NEXT_PUBLIC_*`, rotate it in the Firebase console.

**Next:**

5. **A10-003** — delete board doc first, then `recursiveDelete`.
6. **A06-001** — invite listener `limit(100)`, per-user board cap, invite cap; optionally invite only existing accounts.
7. **A09-001 + A10-001 + A01-001 + S17** — `authorizeRequest()` helper: Origin check, structured `console.error` for 4xx/5xx, generic client errors with correlation id.
8. **A02-001** — nonce CSP via `proxy.ts`; narrow `img-src`/`frame-src`; explicit HSTS.

**Later / hygiene:** A06-002 (rules `affectedKeys` scoping), A08-001 (server-only `memberProfiles`), A06-003 (platform rate limiting), A07-003 (console settings), A01-003/A10-004/A02-003/A02-005/A06-005/A03-001.

---

## 8. Limitations and suggested verifications

Static review cannot confirm:

- **Deployed configuration:** Vercel env (`FIREBASE_APPCHECK_ENFORCE`, site keys, `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG`), live response headers (HSTS, CSP as served), Vercel install command (`npm ci` vs `npm install`), custom domains.
- **Firebase console:** App Check enforcement state, Auth password policy, e-mail enumeration protection, authorized domains, provider linking behaviour.
- **Dependency vulnerabilities:** no advisory database was queried; the plan's §2 triage stands unverified.
- **Runtime behaviour:** race windows (A06-002, A06-004, A10-003) and client load thresholds (A06-001) were reasoned from code, not reproduced.
- **Logging pipeline:** Vercel/Firebase retention and alerting.

Verifications the owner can run (each executes code or makes network calls, so they were not run here):

```bash
# live headers (HSTS, CSP, cookie flags)
curl -sI https://kanban-board-app-ten-psi.vercel.app/sign-in
```

```bash
# A05-001 reproduction against a preview deployment with a test account's cookie and App Check header
curl -s -X POST https://<preview-host>/api/boards -H 'Content-Type: application/json' -b 'session=<cookie>' -d '{"boardId":"<ownBoardId>/cards/zzz","title":"probe","language":"en"}'
```

```bash
# A02-002: does any production chunk embed the debug token key?
curl -s https://kanban-board-app-ten-psi.vercel.app/ | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u | head -50
```

```bash
# A03: advisory check for the production tree
npm audit --omit=dev --audit-level=high
```

Expected after fixes: the first `POST` returns `400`; no chunk contains `APP_CHECK_DEBUG`; `strict-transport-security` is present.

---

*Report produced with the OWASP Security Audit plugin (owasp-security-audit:security-audit), static method, 2026-11-04. Secrets were not read or reproduced; `.env.local` key names only.*
