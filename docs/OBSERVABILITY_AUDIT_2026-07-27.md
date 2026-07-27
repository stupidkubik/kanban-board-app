# Observability audit — 27 July 2026

## Status and decision

The authenticated read-only review is complete. Vercel Observability plus
Firebase Console provide enough server-side diagnostics and usage visibility for
the current pet-project scale. Do not add Sentry, OpenTelemetry, or session
replay pre-emptively.

The current setup does not capture client-side exceptions and does not provide
automatic anomaly alerts on the Hobby plan. Reconsider a minimal client error
sink only after a real client failure cannot be investigated with the available
data.

No settings, alerts, billing configuration, or App Check enforcement were
changed during this review.

## Production evidence

- production `/` redirects to `/sign-in`;
- the sign-in page responds without a server error;
- an unauthenticated protected API request returns the expected `401`, not `500`;
- two guarded production smoke runs passed and independently verified cleanup;
- the production stale-profile dry-run found no stale documents.

The smoke uses a synthetic `smoke-*` UID and a uniquely prefixed board title. It
does not log user email, card content, tokens, or service-account data.

## Vercel

The project is on the Hobby plan.

- Runtime logs are available and can be filtered by console level, resource,
  environment, route, request path, status code, host, service, request method,
  branch, and deployment ID.
- The inspected 30-minute window contained two `GET /` request rows and no
  warning, error, or fatal entries. Their message fields were empty; no email,
  card content, token, or credential was visible.
- Hobby runtime-log selection is limited to the last 30 minutes or last hour.
  The older smoke run therefore could not be correlated in raw logs.
- The Observability overview provides a 12-hour production view. At inspection
  time Vercel Functions showed 0% errors and 0% timeouts.
- The route table showed 14 invocations for `/` with 7 seconds active CPU and
  0% errors, plus one `/api/boards/[boardId]` invocation with 620 ms active CPU
  and 0% errors. P75 duration was not populated for this low traffic sample.
- Anomaly alerts and 30-day Observability retention require upgrading to Pro.

This is sufficient for recent server/API incidents, but not for delayed incident
discovery or browser-only failures.

## Firebase

The project uses the Spark no-cost plan. A paid-budget alert is not applicable
to the current `$0/month` plan; usage still needs periodic manual review.

Cloud Firestore for the last 24 hours showed:

- 249 reads;
- 7 writes;
- 6 deletes;
- peak 5 snapshot listeners;
- peak 4 active connections.

The volume is far below a level that justifies pagination, denormalized counters,
or load optimization without a separate performance signal.

Authentication has four users. Email/password and Google providers are enabled.
The current billing-period DAU and MAU charts contain no data.

One user is an identifiable legacy cloud-E2E account from the pre-emulator
workflow. A read-only Admin SDK check found:

- no board memberships;
- no `memberProfiles` documents;
- one `users/{uid}` document.

Deleting the Auth user and its `users/{uid}` document is a separate destructive
cleanup and requires explicit approval.

App Check findings:

- the web app is registered with reCAPTCHA Enterprise;
- Cloud Firestore enforcement is off;
- Authentication enforcement is off;
- product request metrics were not displayed in the API table.

Do not enable enforcement directly in production. Treat it as a staged rollout:
verify production tokens and metrics first, enable enforcement in a controlled
window, then repeat sign-in, board API, and Firestore checks.

## Operating procedure

Before releases:

1. inspect Vercel logs and the 12-hour Functions/Edge overview;
2. inspect Firestore 24-hour operations and connection peaks;
3. check Authentication and App Check status;
4. run the guarded smoke only when write verification is needed;
5. investigate any unexpected increase before introducing architectural
   optimizations or another telemetry SDK.
