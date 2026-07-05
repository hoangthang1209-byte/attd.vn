# ADR-0001: Architecture Authority

## Status

Accepted

## Context

ATTD.vn contains multiple business modules across public frontend, CMS/Admin, APIs, Prisma, CRM, Quote, Product CMS, Tech Pack, Pattern, Dealer, and Manufacturing workflows. Future implementation work may be performed by Codex, Cursor, other AI agents, or humans.

Without a shared authority, modules can drift into conflicting folder conventions, API shapes, permission checks, validation patterns, and admin UI behavior.

## Decision

ATTD.vn will use these folders as source-of-truth standards:

- `docs/authority`
- `docs/engineering`
- `docs/cms-design-system`

Future module chats and implementation sprints must follow them. Codex, Cursor, other AI agents, and humans must not create conflicting patterns when a standard exists.

## Consequences

- New work starts from the authority documents.
- CMS/Admin UI work follows the CMS Design System.
- Public frontend UX remains separate from the CMS Design System.
- Existing APIs and modules can migrate gradually to standards when touched.
- Intentional deviations must be documented in sprint notes or a future ADR when they affect future work.
