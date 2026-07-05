# `src/lib/logger`

Shared logging foundations belong here.

Do place here:

- Logger configuration.
- Safe logging wrappers.
- Redaction helpers.
- Cross-module logging context utilities.

Do not place here:

- Raw secrets, passwords, tokens, or session cookies.
- User-facing error copy.
- Module-specific business logic.
