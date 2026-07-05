# ADR-0004: Permission Model

## Status

Accepted

## Date

2026-07-05

## Decision

ATTD.vn will use explicit platform/action permission boundaries.

Middleware/proxy is defense-in-depth only. Route handlers and platform services must enforce server-side authorization before returning sensitive data or performing mutations.

Permission boundaries follow the Operating Model v1.0 platforms and the action vocabulary documented in `docs/security/permission-matrix.md`.

## Rationale

ATTD.vn contains CRM records, quotes, dealer data, pricing, margins, production evidence, private files, staff assignments, and internal notes. Permission safety must be enforced before expanding revenue workflows, dealer workflows, production evidence, exports, and public token documents.

The current system already has admin sessions, role permission grants, legacy role fallback, dealer portal sessions, and public token routes. CTO-3 formalizes the direction so future refactors can harden those paths without renaming routes or changing existing business behavior prematurely.

## Consequences

New mutation routes must document the expected platform/action permission.

Future refactors will centralize guard helpers and gradually wire route handlers and platform services to those helpers.

Public token routes require data minimization tests and must never expose internal notes, costs, margins, staff-only metadata, or unrelated customer data.

Dealer routes require dealer session checks and dealer company ownership checks.

Export, download, destructive, approve, publish, release, and private-file routes require explicit elevated permissions in future hardening sprints.
