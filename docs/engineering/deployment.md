# Deployment

ATTD.vn deployment should be safe, incremental, and easy to verify.

## Before Deploy

- Confirm TypeScript passes.
- Confirm build passes.
- Confirm diff checks pass.
- Confirm no raw secrets are present.
- Confirm no destructive migration is included without explicit note.
- Confirm affected routes, APIs, permissions, and data flows were checked.

## Database

- Use intentional Prisma migrations for schema changes.
- Never edit applied migrations casually.
- Document destructive or high-risk migrations before deployment.

## After Deploy

Every sprint report must include a production smoke test note. The note should state what was checked in production, or state that production smoke testing is still pending.

## Rollback Awareness

Prefer small deployable increments so rollback or forward-fix decisions are clear. Do not bundle unrelated architectural, UI, database, and business logic changes into one deployment unless explicitly approved.
