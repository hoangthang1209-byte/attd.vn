# Validation Conventions

Validation protects database integrity, user trust, and operational workflows.

## Layers

- Client-side validation may improve UX, but it is not authoritative.
- Server-side validation is required for API routes, server actions, and mutations.
- Database constraints should enforce durable rules such as uniqueness, required relations, and referential integrity.

## Rules

- Validate input before mutations.
- Return user-facing validation messages that are safe to display.
- Keep field-level validation near the boundary and reusable domain validation in `src/features` or `src/lib/validation`.
- Do not bury validation rules only inside UI components.
- Preserve existing validation behavior unless a sprint explicitly changes it.

## Error Shape

New and migrated API validation errors should follow [API Conventions](./api-conventions.md) with stable codes and optional safe `details`.
