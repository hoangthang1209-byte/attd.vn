# Testing

Testing depth should match risk and blast radius.

## Required Baseline

- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Run `git diff --check`.
- Run `git diff --cached --check` before commit.

## Scope Guidance

- Narrow documentation-only changes may only need baseline validation.
- Shared helper changes need focused tests or direct verification for affected callers.
- API changes need route-level validation of success, validation failure, permission failure, and unexpected error paths.
- UI changes need loading, empty, error, and success state checks when async data is involved.
- Permission changes need explicit admin, staff, owner, dealer, or public-token checks depending on the affected surface.

## Reporting

Sprint reports must list validation commands and results. If a command cannot run or fails for unrelated reasons, report that clearly.
