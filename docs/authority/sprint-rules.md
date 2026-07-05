# Sprint Rules

Every future sprint prompt must begin with:

> Before implementing, follow docs/authority and docs/engineering as the authoritative ATTD.vn engineering standards. For CMS/Admin UI, also follow docs/cms-design-system. Do not invent new architecture, folder conventions, API response shapes, permission checks, or admin UI patterns when a standard exists.

## Sprint Expectations

- Read the relevant authority documents before implementation.
- Preserve existing business logic unless the sprint explicitly asks to change it.
- Preserve existing routes, APIs, data, permissions, and deployment behavior unless the sprint explicitly scopes a migration.
- Prefer gradual migration to standards over broad rewrites.
- Record intentional deviations in the sprint summary or an ADR when the decision affects future work.
