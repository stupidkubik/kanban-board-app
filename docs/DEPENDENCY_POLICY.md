# Dependency maintenance policy

Use this checklist before a release and whenever production dependencies change.

## Routine review

1. Run `npm outdated`.
2. Run `npm audit --omit=dev`.
3. Review direct and transitive changes in `package-lock.json`.
4. Keep unrelated framework and infrastructure upgrades in separate commits.
5. Run `npm ci`, lint, unit tests, Firestore Rules tests, the production build,
   and Cypress before release.
6. Record unresolved advisories and the reason an available fix is not applied.

Do not run `npm audit fix --force`. A suggested downgrade or semver-major update
is not a safe automatic fix.

## Next.js

Patch updates may be applied independently and must pass the full local gate.
Track the `next -> postcss` and `next -> sharp` advisory paths until compatible
fixed releases are available. Do not accept npm's suggested downgrade to an old
Next.js major.

## Firebase Admin

Keep `firebase-admin` on the compatible 13.x line. Version 14.x currently fails
in Vercel Functions with `ERR_REQUIRE_ESM` through `jwks-rsa@4 -> jose@6`.

Treat a future 14.x update as a compatibility migration:

1. use a dedicated branch and commit;
2. perform a clean install and the full local gate;
3. deploy a preview;
4. verify `/`, session handling, and protected board APIs;
5. inspect Vercel runtime logs;
6. promote only after the preview is clean.

Do not combine this migration with a Next.js upgrade.

## Current baseline

As of 27 July 2026, `npm audit --omit=dev` reports 3 high and 8 moderate
production advisories, with no compatible automatic fix. The high findings are
the Next.js transitive `postcss` and `sharp` paths. The moderate findings are in
the Firebase Admin Google Cloud dependency tree. Next.js 16.2.12,
`eslint-config-next` 16.2.12, and `radix-ui` 1.6.7 are the reviewed patch/minor
baseline; `firebase-admin` remains on 13.x.
