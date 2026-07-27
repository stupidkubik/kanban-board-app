# Observability audit — 27 July 2026

## Status

The public production HTTP checks and controlled Firebase smoke are complete,
but the authenticated console review is still pending. The available browser
session was not signed in to Vercel or Firebase, so retention, alerts, billing,
quota, and App Check enforcement have not been inferred or marked as configured.

No external telemetry SDK should be added until this review is completed.

## Evidence already collected

- production `/` redirects to `/sign-in`;
- the sign-in page responds without a server error;
- an unauthenticated protected API request returns the expected `401`, not `500`;
- two guarded production smoke runs passed and independently verified cleanup;
- the production stale-profile dry-run found no stale documents.

The smoke event contains a synthetic `smoke-*` UID and a uniquely prefixed board
title. It contains no user email, card content, token, or service-account data.

## Authenticated Vercel review

Record, without copying sensitive log payloads:

- whether runtime 4xx/5xx and stack/error messages are searchable;
- available route, deployment, request-id, and time filters;
- latency metrics and their granularity;
- log and metric retention on the current plan;
- alert support and whether it requires a plan change;
- whether the smoke deployment/request can be found;
- whether sampled logs contain email, card content, tokens, or credentials.

## Authenticated Firebase review

Record:

- Firestore daily reads, writes, and deletes after the smoke;
- current quota/usage and billing-plan status;
- whether budget alerts exist;
- Authentication usage;
- App Check request metrics and enforcement status.

Do not enable enforcement, create alerts, or change billing as part of the
read-only review. Any such change needs a separate explicit decision.

## Decision gate

- Keep Vercel plus Firebase Console if the available data is sufficient for this
  pet project.
- Consider a minimal client error sink only if client-side failures cannot be
  investigated with the available data.
- Do not add Sentry, OpenTelemetry, or session replay pre-emptively.
