# `src/lib/permissions`

Shared permission foundations belong here.

`permission-registry.ts` defines the CTO-3 platform/action vocabulary and
public-token forbidden-field list. It is intentionally constant-only for now;
future sprints can wire routes and services to it after route-level tests exist.

CTO-4 adds guard foundations:

- `require-admin-permission.ts` for transitional admin route guards.
- `require-dealer-permission.ts` for dealer session and company ownership guards.
- `public-token-safety.ts` for public-token payload field scans.
- `index.ts` for shared exports.

Do place here:

- Cross-module admin permission helpers.
- Staff and owner session permission utilities.
- Public-token and dealer-portal permission primitives when reused across modules.

Do not place here:

- UI-only visibility logic as the only permission check.
- Module-specific permission rules that are better owned in `src/features/[module]`.
- Middleware-only authorization substitutes for server-side mutation checks.

Rules:

- Middleware/proxy is defense-in-depth only.
- Mutations must check authorization in route handlers or platform services.
- Dealer portal mutations must validate dealer session and company ownership.
- Public-token routes must stay read-only and data-minimized.
