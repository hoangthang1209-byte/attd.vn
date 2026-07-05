# `src/lib/api`

Shared API helpers belong here.

Do place here:

- Standard success and error response helpers.
- API error code utilities.
- Safe request parsing helpers.
- Cross-module route handler helpers.

Do not place here:

- Module-specific business logic.
- UI components.
- Secrets or raw provider credentials.
- One-off helpers used by only a single route unless they are intended to become shared.
