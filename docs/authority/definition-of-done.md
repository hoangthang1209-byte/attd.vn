# Definition of Done

This global Definition of Done applies to all future ATTD.vn sprints unless a sprint defines stricter validation.

## Required Checks

- TypeScript passes: `npx tsc --noEmit`.
- Build passes: `npm run build`.
- Diff check passes: `git diff --check`.
- Staged diff check passes before commit: `git diff --cached --check`.
- Existing routes are preserved.
- Existing data is preserved.
- Permission behavior is checked for affected admin, staff, owner, dealer, and public-token flows.
- UI changes include loading, empty, and error states where user-facing async work exists.
- API errors are normalized for new APIs and migrated APIs.
- No raw secrets are committed.
- No destructive migration is included without an explicit note and approval path.
- Production smoke test note is required after deployment.

## Notes

If a validation command fails because of an unrelated pre-existing issue, the sprint report must identify the command, summarize the failure, and explain why the change is still safe or why deployment is blocked.
