# `src/lib/errors`

Shared error foundations belong here.

Do place here:

- App error classes or factories.
- Error code definitions.
- Safe error serialization helpers.
- Mappers from internal errors to normalized API responses.

Do not place here:

- Raw secrets or raw provider payloads.
- UI components for displaying errors.
- Module-specific business decisions that belong in `src/features/[module]`.
