# Regression coverage matrix

Status as of 27 July 2026. This matrix is the acceptance checklist for phase 2
of the refactoring work plan.

| Contract | Current evidence | Status | Next action |
| --- | --- | --- | --- |
| Viewer read-only | `header-section.test.tsx`; `rules.test.ts` | covered | Keep both gates green. |
| Owner/editor content writes | `rules.test.ts` covers editor metadata, columns, and cards; Cypress covers the owner content flow | covered | Add role-specific E2E only when role management enters scope. |
| Owner-only destructive actions | `board-route.test.ts` covers unauthenticated, non-owner, and owner delete paths; `participants-section-view.test.tsx` covers owner-only member controls; Rules reserve destructive operations for server routes | covered | Keep route, component, and Rules gates green. |
| `members`/`roles` sync | `member-routes.test.ts` covers invite acceptance and member removal transactions; Rules prevent client-side membership changes | covered | Keep both server-route and Rules gates green. |
| Listener cleanup | `firestore-api-listeners.test.ts` checks one listener per cache entry and `unsubscribe()` after removal | covered | Keep the lifecycle contract during endpoint extraction. |
| Listener error and retry | `firestore-api-listeners.test.ts` checks forbidden state and a new subscription key | covered | Preserve the public retry contract. |
| Optimistic rollback | `firestore-api-optimistic.test.ts` covers rejected create, move, and delete writes | covered | Add a case if a future non-move update becomes optimistic. |
| Duplicate prevention | `firestore-api-optimistic.test.ts` repeats create with the same entity id | covered | Preserve stable ids through UI Undo/retry paths. |
| Card move | `board-order.test.ts`; Cypress cross-column DnD plus card create/edit/delete/Undo | covered | Keep both unit and E2E gates green. |
| Card cap guard | `card-cap.test.ts` covers the 499/500 boundary used by the production UI | covered | Preserve the boundary when card projections move. |
| App Check headers | `app-check-fetch.test.ts` | covered | Keep custom request headers covered. |
| Session and API authorization | `sign-in-page.test.tsx` covers session bootstrap; board/member route tests cover 401/403/owner scenarios | covered | Extend route coverage when authorization behavior changes. |
| Secret-free trace | `server-trace.test.ts`; production `npm run build` baseline | covered | Keep the build trace check in the release gate. |

## Execution order

1. RTK Query listener and optimistic mutation contracts.
2. Session and API route authorization, including `members`/`roles` sync.
3. Viewer/owner component controls and the 500-card boundary.
4. Critical Cypress CRUD/Undo expansion.
5. Full lint, unit, Rules, build, and two consecutive Cypress runs.

All matrix rows are covered. Final gate on 27 July:

- lint passed;
- unit: 59 passed, 11 skipped;
- Firestore Rules: 11 passed;
- production build passed; secret-free server trace passed for 14 manifests;
- Cypress passed twice consecutively, 2/2 scenarios each time, with verified
  emulator cleanup.
