# ADR-0003: Domain Boundaries

## Status

Accepted

## Date

2026-07-05

## Decision

ATTD.vn uses Operating Model v1.0 domain boundaries for source ownership and future module planning.

Source ownership should follow platform boundaries:

- CRM Platform
- Commercial Platform
- Product Platform
- Dealer Platform
- Manufacturing Platform
- Tech Pack Platform
- Content Platform
- Business Intelligence
- Operations Platform
- AI Platform
- Growth Platform

Cross-platform behavior must go through explicit services, API patterns, or documented read models. It must not depend on hidden coupling inside UI components, page components, or ad hoc route handlers.

Existing code will be migrated gradually. Compatibility routes, existing Prisma model names, and current database relations remain valid unless a future sprint explicitly scopes and validates a migration.

## Rationale

Operating Model v1.0 gives ATTD.vn a stable way to decide where new source files, APIs, UI modules, Prisma ownership, and documentation belong. This reduces duplicated business logic and keeps public, admin, dealer portal, document, API, and shared infrastructure boundaries easier to reason about.

The current codebase already has many feature-level services, but some legacy surfaces still mix data access, UI composition, and business rules. A gradual migration avoids destabilizing production while improving maintainability.

## Consequences

Future sprints must identify the owning platform before adding or moving module code.

Shared behavior should live in `src/lib` only when it is genuinely cross-platform infrastructure. Platform-specific domain behavior should live under the owning `src/features/[module]` area.

Admin UI should use `src/components/admin` and CMS Design System patterns. Public UI should remain separate from admin UI.

API routes should increasingly delegate validation, permission checks, and business behavior to platform services while preserving existing route contracts until a sprint explicitly migrates them.
