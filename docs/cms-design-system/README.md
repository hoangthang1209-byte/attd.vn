# ATTD CMS Design System

This folder is the authoritative design authority for ATTD CMS/Admin user experience and interface work.

## Scope

This system applies only to internal operational CMS/Admin surfaces:

- Admin dashboard
- Product CMS
- Category CMS
- CRM
- Quote
- Dealer admin
- Manufacturing library admin
- Tech pack admin
- Pattern admin
- Materials
- Suppliers
- Media library
- Settings
- Users
- Roles

## Non-Scope

This system does not apply to public frontend experiences:

- Homepage
- Public product pages
- Dealer landing
- Public blog
- SEO landing pages

Public frontend UX may have its own visual direction. Do not use this CMS design authority to constrain customer-facing marketing, catalog, SEO, or landing experiences.

The CMS Design System does NOT govern public website frontend UX.

## Core Principle

ATTD CMS is an operational system: fast, calm, clear, and consistent.

Admin users should be able to scan records, make decisions, complete edits, and recover from mistakes without visual noise or unexpected interaction patterns.

## Authority Rules

- CMS/Admin modules must follow this system.
- Do not invent new admin layouts, colors, spacing, components, or interaction patterns when a CMS standard exists.
- Existing module business logic must not be changed for visual consistency work.
- New admin UI should prefer shared admin components before local one-off implementations.
- Public frontend UX is out of scope.

## Definition of Done for CMS UI

A CMS/Admin UI change is done when:

- It follows the foundations, layout, component, and pattern guidance in this folder.
- It uses existing shared admin components where available.
- It keeps business logic, permissions, data contracts, and validation behavior unchanged unless the sprint explicitly requires otherwise.
- It supports keyboard navigation for core actions.
- It provides clear loading, empty, error, and success states.
- It handles destructive actions with confirmation and clear consequences.
- It works at desktop admin widths and degrades predictably on tablet/mobile.
- It passes project validation required by the sprint.

## Documents

- [Foundations](./foundations.md)
- [Layout](./layout.md)
- [Components](./components.md)
- [Patterns](./patterns.md)
- [Module Templates](./module-templates.md)
- [Implementation Guide](./implementation-guide.md)
