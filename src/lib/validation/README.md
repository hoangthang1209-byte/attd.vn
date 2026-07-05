# `src/lib/validation`

Shared validation foundations belong here.

Do place here:

- Cross-module validation helpers.
- Shared schemas used by multiple modules.
- Normalized validation error mapping.

Do not place here:

- UI-only validation.
- Business rules that belong to one module in `src/features/[module]`.
- Database migrations or Prisma schema changes.
