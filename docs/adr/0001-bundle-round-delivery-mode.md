# ADR-0001 — Delivery mode is authoritative on the bundle round, not the session

Status: Accepted
Date: 2026-08-06

## Context

A bundle round's delivery mode (`form` vs `voice`) is recruiter-assigned per round
at link-generation time. The same value is currently written to two tables:

- `interview_bundle_round.delivery_mode` (`RoundDeliveryMode`, no default)
- `interview_session.delivery_mode` (`DeliveryMode`, default `"hybrid"` for
  legacy standalone sessions)

This duplication caused real confusion during debugging (see the "round 3 ran as
form" incident): the session copy and the bundle-round copy can drift, and the
legacy `"hybrid"` value on sessions means every consumer must re-implement the
same `=== "voice" ? "voice" : "form"` coercion.

## Decision

`interview_bundle_round.delivery_mode` is the **single source of truth** for the
delivery mode of a bundle round. All candidate-facing routing (validate, schema,
start-voice, complete) and all client mode decisions read from the active bundle
round.

`interview_session.delivery_mode` remains only as a denormalized convenience
copy for legacy (non-bundle) sessions and for admin display. New code must not
derive behavior from the session copy when the session belongs to a bundle.

The coercion rule `deliveryMode === "voice" ? "voice" : "form"` lives in exactly
one place: `packages/db/src/round-progression.ts` (`coerceDeliveryMode`). Callers
import it; they do not re-implement it.

## Consequences

- Future readers must not add a new per-round mode column or re-introduce a
  session-derived mode decision for bundle rounds.
- Legacy `"hybrid"` sessions keep working via the session copy and the legacy
  mode picker; they are the only place the session copy is behavior-defining.
- A schema consolidation (dropping the bundle-round mode off the session table)
  is possible later but was deliberately not done in this change to avoid a
  heavy migration.
