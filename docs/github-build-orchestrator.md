# GitHub Build Orchestrator (Phase F1b)

Event-driven orchestration for low-risk ATTD software factory tasks: reviewer-driven repair, CI failure repair, and a single active Builder queue.

Requires the Phase F1a task status foundation (`docs/github-task-status.md`).

## Operating model

For **low-risk** tasks only:

`Issue/spec → BUILD_APPROVED → Cursor Builder → PR → CI/Vercel → ATTD PR Reviewer → (optional auto-repair) → READY TO MERGE`

The owner does not need to manually post `BUILD_APPROVED` for each P2 repair iteration when orchestration handles it.

**Never auto-merges. Never deploys production. Never uses Cursor credentials in the repo.**

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `build-orchestrator-pr-review.yml` | `pull_request_review` submitted | Parse ATTD PR Reviewer output and trigger repair / blocked / ready states |
| `build-orchestrator-ci-failure.yml` | `CI` workflow completed with failure | Create/reuse one CI repair task for low-risk PRs |
| `build-orchestrator-queue.yml` | cron + manual | Resume deferred repair tasks when no active Builder work remains |

Shared logic: `.github/scripts/build-orchestrator-common.sh`

## Reviewer-driven repair

Conservative detection requires a review body containing both:

- `CURSOR_AUTOMATION_ID:`
- `Independent ATTD PR Review`

Parsed counts come from the structured reviewer summary:

- `No P0/P1 findings.` → P0 = 0, P1 = 0
- Numbered `**N.` items under `#### P2` / `#### P3` headings
- Fallback: `- P0: N` style lines when present

Outcomes:

| Condition | Action |
| --- | --- |
| P0 > 0 or P1 > 0 | Set linked issues to `status:blocked`; post `ORCHESTRATOR_BLOCKED` on PR; **no** auto-repair |
| P0 = 0, P1 = 0, P2 > 0 | Create/reuse one repair issue; post exact `BUILD_APPROVED` when queue allows |
| Only P3 (P2 = 0) | Post exact `READY TO MERGE` on PR; set linked issues to `status:ready-to-merge` |
| Not low-risk | Post high-risk block comment; set `status:blocked` |

## CI failure trigger

When the `CI` workflow fails on a pull request:

1. Confirm the PR is low-risk (linked issue has `risk:low`, no `risk:high`).
2. Set linked issues to `status:ci-failed`.
3. Create or reuse one repair issue keyed to PR number + head SHA.
4. Post `BUILD_APPROVED` when the Builder queue allows.

At most **one** CI repair trigger per PR head SHA (idempotency marker).

## Continuous queue

Only **one** active Builder task is allowed at a time (open issues labeled `status:approved` or `status:building`, excluding terminal blocked/ready/merged/stalled states and deferred `status:queued` repairs).

Parent tracking labels such as `status:pr-open` and `status:ci-failed` do **not** count as active Builder work.

When a repair would start but another task is active:

- Post `ORCHESTRATOR_QUEUE_DEFERRED` on the repair issue
- Set the repair issue to `status:queued`
- The queue workflow retries deferred issues when no active Builder work remains

A historical `ORCHESTRATOR_QUEUE_DEFERRED` comment alone does **not** keep an issue deferred after authorized `BUILD_APPROVED` was posted and the repair was promoted (`status:building`). Only `status:queued` or a defer comment **without** authorized `BUILD_APPROVED` remains eligible for queue reconciliation.

Do not start unrelated feature work while a repair task is active.

## Idempotency

Every orchestrator action embeds an auditable marker keyed on stable PR + head SHA identifiers:

`ORCHESTRATOR_IDEMPOTENCY: <kind>-pr-<number>-sha-<sha>`

Duplicate reviewer events or CI failures for the same PR head SHA do **not** create duplicate repair issues or duplicate `BUILD_APPROVED` comments when a **terminal** PR comment already carries that marker (run IDs are not part of dedup identity).

### Terminal vs claim-only markers

PR-level dedup requires a **terminal** comment body that includes the marker **and** at least one terminal token:

- `ORCHESTRATOR_REPAIR_TRIGGERED:` or `ORCHESTRATOR_CI_REPAIR_TRIGGERED:`
- `ORCHESTRATOR_BLOCKED:`
- `READY TO MERGE`
- `ORCHESTRATOR_QUEUE_DEFERRED:`

A **claim-only** comment (`ORCHESTRATOR_REPAIR_CLAIM:` with the marker but none of the terminal tokens above) does **not** block later triggered or deferred comments. This prevents orphan claim comments from leaving repairs stuck without a resumable terminal state.

Issue-level markers and `BUILD_APPROVED` authorization remain separate guards against duplicate Builder triggers.

## BUILD_APPROVED authorization (orchestrator path)

Human owner comments remain the primary authorization path (F1a).

Orchestrator repair issues (`orchestrator:review-repair`, `orchestrator:ci-repair`) also accept exact `BUILD_APPROVED` from `github-actions[bot]` so GitHub Actions can trigger Builder without storing owner PATs in the repo.

## Safety gates

Orchestration **never auto-advances** when:

- Linked issue has `risk:high`
- Linked issue lacks `risk:low` (CI/repair automation requires explicit low-risk label)
- Issue text matches high-risk domains (pricing, payment, banking, SePay, auth, permissions, invoices, accounting, destructive migrations, bulk rewrites/deletes) unless `HIGH_RISK_APPROVED` is present in the issue

No auto-merge. No production deployment. No paid Cursor on-demand escalation.

## Labels

| Label | Purpose |
| --- | --- |
| `status:ready-to-merge` | Review clean (P0/P1/P2 = 0); human merge still required |
| `status:blocked` | P0/P1 or high-risk gate blocked automation |
| `status:ci-failed` | Required CI failed on linked PR |
| `status:queued` | Deferred repair waiting for Builder queue |
| `orchestrator:review-repair` | Repair issue created from reviewer P2 findings |
| `orchestrator:ci-repair` | Repair issue created from CI failure |

## Stop conditions

Orchestration stops without triggering Builder when:

- Review is not from ATTD PR Reviewer automation
- P0 or P1 findings exist
- Task is high-risk without `HIGH_RISK_APPROVED`
- Idempotency marker already recorded for the PR head SHA + event kind
- Builder queue has another active task (deferred instead of duplicate trigger)

## Verification checklist

- [ ] P2-only low-risk review creates exactly one repair issue + one `BUILD_APPROVED`
- [ ] Duplicate reviewer events for same head SHA do not duplicate repairs
- [ ] P0/P1 reviews post blocked state without auto-repair
- [ ] CI failure creates at most one repair per head SHA
- [ ] High-risk linked issue never receives orchestrator `BUILD_APPROVED`
- [ ] P3-only review posts `READY TO MERGE` without auto-merge
- [ ] Deferred queue resumes when active Builder task completes

## Local tests

```bash
bash -n .github/scripts/build-orchestrator-common.sh
bash -n .github/scripts/task-status-common.sh
bash .github/scripts/build-orchestrator-common.test.sh
bash .github/scripts/build-orchestrator-terminal-predicate.test.sh
bash .github/scripts/build-orchestrator-idempotency.test.sh
bash .github/scripts/build-orchestrator-queue.test.sh
bash .github/scripts/build-orchestrator-handler.test.sh
bash .github/scripts/build-orchestrator-deferred-repair.test.sh
```

The CI `Verify` job runs `bash -n` on orchestrator scripts and all `build-orchestrator-*.test.sh` files (no GitHub API credentials required).

Live GitHub Actions behavior requires merge and workflow runs on real PR/review events.
