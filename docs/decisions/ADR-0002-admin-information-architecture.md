# ADR-0002: Admin Information Architecture

## Status

Accepted

## Date

2026-07-05

## Decision

Admin navigation follows Operating Model v1.0.

The admin sidebar is organized into these major sections:

- KINH DOANH
- SẢN PHẨM
- WEBSITE
- ĐIỀU HÀNH
- AI

Each section contains platform-level groupings with operational menu items underneath. Existing admin URLs remain valid and menu items point to current routes where the target module already exists. Modules that do not yet have an admin route are represented as `Sắp ra mắt` items instead of new placeholder pages.

## Rationale

The Operating Model v1.0 structure arranges admin work by daily operational frequency and business domain. This makes the sidebar easier to scan for staff who move between CRM, commercial operations, product data, manufacturing, content, reporting, platform operations, and AI workflows.

Centralizing the navigation in `src/lib/admin/admin-navigation.ts` also gives future sprints one typed source of truth for platform placement, route compatibility, item status, and permission requirements.

## Consequences

Future admin modules must be placed under one of the defined platforms before they appear in the sidebar.

Navigation-only changes should keep existing admin routes intact and update item status from `coming-soon` to `active` when a real route becomes available.

Permission behavior remains tied to existing admin permission flags unless a future sprint explicitly extends the permission model.
