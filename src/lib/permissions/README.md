# `src/lib/permissions`

Shared permission foundations belong here.

Do place here:

- Cross-module admin permission helpers.
- Staff and owner session permission utilities.
- Public-token and dealer-portal permission primitives when reused across modules.

Do not place here:

- UI-only visibility logic as the only permission check.
- Module-specific permission rules that are better owned in `src/features/[module]`.
- Middleware-only authorization substitutes for server-side mutation checks.
