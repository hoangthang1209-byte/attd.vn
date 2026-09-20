# GitHub Task Status (Phase F1a)

Minimal GitHub issue status labels and automation for ATTD Builder task tracking.

Full PR/CI/reviewer lifecycle automation from Phase F1 (#29) is **deferred** to a later phase. This document covers only the F1a foundation.

## Labels

| Label | Purpose |
| --- | --- |
| `status:approved` | Issue received an authorized `BUILD_APPROVED` comment |
| `status:building` | Reserved for future build-in-progress signaling |
| `status:stalled` | Approved task with no linked PR after watchdog threshold |
| `status:pr-open` | Linked pull request exists and is not merged |
| `status:merged` | Linked pull request was merged |
| `risk:low` | Manual or future automation for low-risk tasks |
| `risk:medium` | Manual or future automation for medium-risk tasks |
| `risk:high` | Manual or future automation for high-risk tasks |

Only one `status:*` label is active on an issue at a time. Non-status labels are preserved.

## Transitions

### BUILD_APPROVED → `status:approved`

Workflow: `.github/workflows/task-status-build-approved.yml`

When a new issue comment body equals `BUILD_APPROVED` (after trimming leading/trailing whitespace):

1. Ensure standard labels exist.
2. Add `status:approved`.
3. Remove any other `status:*` labels.

This does **not** change Builder authorization behavior.

### Linked PR opened → `status:pr-open`

Workflow: `.github/workflows/task-status-pr-events.yml`

When a pull request is opened, reopened, or edited and GitHub reports linked closing issues (`Fixes #123`, `Closes #123`, etc.):

1. Set each linked issue to `status:pr-open`.
2. Remove other `status:*` labels from those issues.

Matching is conservative: only GitHub's native issue linkage is used. Arbitrary `#123` mentions in text are ignored.

### Linked PR merged → `status:merged`

Same workflow on `pull_request` `closed` when `merged == true`:

1. Set linked issues to `status:merged`.
2. GitHub's normal close-on-merge behavior applies when the PR uses closing keywords.

No production deployment or auto-merge is performed.

### Stalled watchdog → `status:stalled`

Workflow: `.github/workflows/task-status-stalled-watchdog.yml`

Runs every 15 minutes (and on manual dispatch). For each **open** issue that has:

- at least one exact `BUILD_APPROVED` comment (trimmed),
- no linked pull request,
- most recent `BUILD_APPROVED` older than **45 minutes**,

the workflow:

1. Sets `status:stalled` and removes other `status:*` labels.
2. Posts one comment: `TASK_STALLED: No linked PR was created within 45 minutes after BUILD_APPROVED.`

Duplicate `TASK_STALLED` comments are not posted on later runs.

If a PR is linked later, the PR workflow transitions the issue to `status:pr-open` normally.

## Shared scripts

- `.github/scripts/task-status-common.sh` — label bootstrap, status label replacement, linkage helpers.

## Out of scope (deferred)

- CI gate integration
- Automated PR reviewer assignment
- Ready-to-merge lifecycle
- Auto-merge
- Production deployment triggers
- Cursor or PAT credentials in the repository

## Verification checklist

- [ ] Exact `BUILD_APPROVED` sets `status:approved`
- [ ] Only one `status:*` label remains after each transition
- [ ] Linked PR sets `status:pr-open`
- [ ] Merged linked PR sets `status:merged`
- [ ] No-PR issue past threshold becomes `status:stalled`
- [ ] Watchdog does not duplicate `TASK_STALLED` comments
- [ ] No auto-merge behavior exists
