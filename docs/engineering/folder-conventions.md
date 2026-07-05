# Folder Conventions

These folders define source ownership and expected placement.

## `src/app/(public)`

Customer-facing public routes, SEO pages, public product pages, public quote links, and other non-admin experiences.

Do not place admin-only UI, admin-only permissions, or staff-only operational flows here.

## `src/app/(backend)/admin`

Admin route surfaces and admin page composition.

Do not hide domain rules directly in page components. Call shared services, validations, and permissions from `src/features` or `src/lib`.

## `src/app/api`

Route handlers and API entrypoints.

Do not duplicate domain logic across API routes. New and migrated APIs should follow the response shape in [API Conventions](./api-conventions.md).

## `src/components/admin`

Admin-only UI components, including shared admin primitives, admin layout, and module-specific admin composition.

Do not import admin components into public frontend surfaces.

## `src/components/public`

Public frontend UI components and public website composition.

Do not import public marketing components into CMS/Admin workflows as a substitute for admin UI.

## `src/features/[module]`

Module-owned domain logic, services, actions, types, helpers, and business behavior.

Do not put reusable cross-module infrastructure here when it belongs in `src/lib`.

## `src/lib`

Shared infrastructure and cross-module foundations: API helpers, validation helpers, permissions, error helpers, logging, storage, auth helpers, and similar reusable code.

Do not use `src/lib` as a dumping ground for module-specific business logic.

## `prisma`

Prisma schema, migrations, and database seed or utility scripts.

Do not casually edit old migrations after they have been applied. New schema changes require intentional migration naming and validation.
