# ATTD.vn Architecture Authority

This folder is the top-level source of truth for ATTD.vn engineering direction.

## Scope

This authority applies to the entire ATTD.vn application: public routes, admin routes, API routes, Prisma, permissions, validation, logging, deployment, and module-level implementation.

CMS/Admin UI standards are defined in [docs/cms-design-system](../cms-design-system). Public frontend UX is handled separately and is not governed by the CMS Design System.

## Rules

- Business modules must not invent architecture independently.
- Every future sprint must reference this authority before implementation begins.
- New module work must follow [docs/engineering](../engineering) for architecture, folders, APIs, Prisma, validation, permissions, errors, logging, testing, and deployment.
- CMS/Admin work must also follow [docs/cms-design-system](../cms-design-system).
- Public frontend UX may have separate visual standards, but it must still follow the engineering authority.

## Authority Documents

- [CTO Principles](./cto-principles.md)
- [Sprint Rules](./sprint-rules.md)
- [Definition of Done](./definition-of-done.md)
