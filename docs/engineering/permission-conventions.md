# Permission Conventions

Permissions must be enforced on the server. UI hiding and middleware checks are helpful, but they are not enough.

## Admin Mutations

- All admin mutations must check server-side auth.
- Middleware is not enough for mutation authorization.
- Staff session and owner session behavior must be respected.
- Permission checks should happen before writes and before returning admin-only data.
- Permission failures should use normalized API errors for new and migrated APIs.

## Public and Token Routes

- Public token routes must never expose admin-only data.
- Token routes should return only the data needed for the public or customer-facing workflow.
- Token validation must happen server-side.

## Dealer Portal

- Dealer portal permissions are separate from admin permissions.
- Dealer portal routes must respect dealer account status, session state, and portal-specific access boundaries.
- Do not grant dealer access through admin-only assumptions.

## Implementation

Shared permission foundations belong in `src/lib/permissions` when they apply across modules. Module-specific permission helpers may live in `src/features/[module]` when the rule is domain-specific.
