# GitHub Task Status (Phase F1a)

Minimal GitHub issue status labels and automation for ATTD Builder task tracking.

Phase F1b adds reviewer/CI repair orchestration on top of this foundation — see `docs/github-build-orchestrator.md`. This document covers the F1a label and watchdog contract.

## Labels

| Label | Purpose |
| --- | --- |
| `status:approved` | Issue received an authorized `BUILD_APPROVED` comment |
| `status:building` | Reserved for future build-in-progress signaling |
| `status:stalled` | Approved task with no linked PR after watchdog threshold |
| `status:pr-open` | Linked pull request exists and is not merged |
| `status:merged` | Linked pull request was merged |
| `status:ready-to-merge` | Independent review clean; human merge still required (F1b) |
| `status:blocked` | Blocked for human attention (F1b) |
| `status:ci-failed` | Required CI failed on linked PR (F1b) |
| `risk:low` | Required for F1b auto-orchestration on linked PRs |
| `risk:medium` | Manual or future automation for medium-risk tasks |
| `risk:high` | Manual or future automation for high-risk tasks |

Only one `status:*` label is active on an issue at a time. Non-status labels are preserved.

## Transitions

### BUILD_APPROVED → `status:approved`

Workflow: `.github/workflows/task-status-build-approved.yml`

When a new **task issue** comment (not a pull-request thread) body equals `BUILD_APPROVED` (after trimming leading/trailing whitespace) **and** the comment author is the repository owner (`github.repository_owner`, matching the Builder trigger policy):

1. Ensure standard labels exist.
2. Add `status:approved`.
3. Remove any other `status:*` labels.

Comments on pull-request threads are ignored. Unauthorized `BUILD_APPROVED` comments are ignored.

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

When a linked PR is **closed without merge**, linked issues are reconciled: if no **open** linked PR remains, the issue reverts to `status:approved` or becomes `status:stalled` when the authorized `BUILD_APPROVED` is older than the watchdog threshold.

When a PR body is **edited** and no longer reports closing references, open issues labeled `status:pr-open` with no **open** linked PR are reconciled the same way.

No production deployment or auto-merge is performed.

### Stalled watchdog → `status:stalled`

Workflow: `.github/workflows/task-status-stalled-watchdog.yml`

Runs every 15 minutes (and on manual dispatch). Candidate issues are pre-filtered to open issues labeled `status:approved` or `status:pr-open`. For each candidate that has:

- at least one authorized exact `BUILD_APPROVED` comment (trimmed, from the repository owner),
- no **open** linked pull request,
- most recent authorized `BUILD_APPROVED` older than **45 minutes**,

the workflow:

1. Sets `status:stalled` and removes other `status:*` labels.
2. Posts one comment: `TASK_STALLED: No linked PR was created within 45 minutes after BUILD_APPROVED.`

Duplicate `TASK_STALLED` comments are not posted on later runs.

If a PR is linked later, the PR workflow transitions the issue to `status:pr-open` normally.

## Shared scripts

- `.github/scripts/task-status-common.sh` — label bootstrap, status label replacement, linkage helpers.

## F1b extensions

Orchestrator workflows may set `status:building` on `orchestrator:*` repair issues when posting automated `BUILD_APPROVED`, and may set `status:ready-to-merge`, `status:blocked`, or `status:ci-failed` per `docs/github-build-orchestrator.md`.

## Out of scope

- Auto-merge
- Production deployment triggers
- Cursor or PAT credentials in the repository

## Verification checklist

- [ ] Authorized exact `BUILD_APPROVED` on a task issue sets `status:approved`
- [ ] Unauthorized or PR-thread `BUILD_APPROVED` comments are ignored
- [ ] Only one `status:*` label remains after each transition
- [ ] Linked open PR sets `status:pr-open`
- [ ] Merged linked PR sets `status:merged`
- [ ] Closed-unmerged linked PR does not leave `status:pr-open`
- [ ] PR body edit that removes linkage reconciles stale `status:pr-open`
- [ ] No open linked PR issue past threshold becomes `status:stalled`
- [ ] Watchdog counts only **open** linked PRs for stall prevention
- [ ] Watchdog does not duplicate `TASK_STALLED` comments
- [ ] No auto-merge behavior exists
