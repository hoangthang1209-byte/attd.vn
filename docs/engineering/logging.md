# Logging

Logging should help diagnose production issues without leaking sensitive data.

## Rules

- Never log raw secrets, passwords, tokens, session cookies, payment details, or private customer content.
- Include stable identifiers when safe: record code, module name, route, action, and request context.
- Log permission failures with safe context, not credential material.
- Log unexpected errors before returning a normalized error response.
- Prefer shared logging helpers once available in `src/lib/logger`.

## Levels

- `info`: expected operational events worth tracing.
- `warn`: recoverable issues, permission denials, partial failures, or unusual input.
- `error`: unexpected failures requiring investigation.

Do not use logging as a replacement for user-facing error handling.
