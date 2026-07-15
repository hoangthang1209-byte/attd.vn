# Architecture

ATTD.vn uses the Next.js App Router as the application routing foundation. Routes, layouts, server components, client components, and route handlers must follow the project version's bundled Next.js documentation in `node_modules/next/dist/docs/`.

## Source of Truth

- Prisma is the source of database truth.
- API routes live under `src/app/api`.
- Admin route surfaces live under `src/app/(backend)/admin` where the app already follows that structure.
- Public route surfaces live under `src/app/(public)` where the app already follows that structure.
- Shared domain logic belongs in `src/features` or `src/lib`, not inside page components.
- Admin UI components live under `src/components/admin`.
- Public frontend components remain separate from admin components.

## Server Boundaries

- All mutations must enforce server-side permission checks.
- Middleware is not enough for mutation authorization.
- Page components should compose data and UI, not hide business rules.
- API handlers should call shared validation, permissions, and domain services where those exist.
- Client components may manage interaction state, but must not become the only place where business rules are enforced.

## Module Boundaries

Business modules should keep domain behavior close to the module in `src/features/[module]`. Shared cross-module foundations belong in `src/lib` only when they are truly reusable.

Do not create conflicting architecture for a single module when an ATTD.vn standard exists.

## Knowledge Graph (design)

Cross-domain relationship overlays are governed by [ADR-0005](../decisions/ADR-0005-enterprise-knowledge-graph.md) and `docs/architecture/knowledge-graph/`. The graph must not duplicate Product, Manufacturing, Pricing, CRM, Media, or SEO authoritative fields.
