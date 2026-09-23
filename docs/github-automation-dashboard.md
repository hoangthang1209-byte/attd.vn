# Admin Automation Dashboard (Phase F2)

Read-only admin dashboard at `/admin/automation` for ATTD owner/admin to monitor software factory tasks from GitHub.

## Data source

GitHub is the source of truth. The dashboard consumes Phase F1 task status labels documented in:

- `docs/github-task-status.md`
- `docs/github-build-orchestrator.md`

No database models or write actions are used.

## Environment variables

Configure on Vercel (Production + Preview) for the admin app:

| Variable | Required | Description |
| --- | --- | --- |
| `GITHUB_AUTOMATION_READ_TOKEN` | Yes | Server-only read-only GitHub token. Never expose to the browser or commit to git. |
| `GITHUB_AUTOMATION_WRITE_TOKEN` | No | Server-only GitHub token used **only** by the `Duyệt & chạy` action to post the exact `BUILD_APPROVED` comment. Dashboard read access works without it; the approve button stays disabled with a setup hint when absent. |
| `GITHUB_AUTOMATION_REPO` | No | Repository in `owner/repo` form. Defaults to `hoangthang1209-byte/attd.vn`. |

### Minimum token permissions

Use a fine-grained or classic PAT with **read-only** access:

- Issues: Read
- Pull requests: Read
- Metadata: Read (required by GitHub API)

Do not grant write, admin, or workflow permissions for the read token.

### Write token permissions (`GITHUB_AUTOMATION_WRITE_TOKEN`)

Use a separate fine-grained PAT with the minimum permissions for one-click approval:

- Metadata: Read
- Issues: Read and Write

Do **not** grant Contents write, Pull requests write, Actions/workflows write, Administration, Secrets, Deployments, or Organization permissions.

**Critical:** `GITHUB_AUTOMATION_WRITE_TOKEN` must authenticate as the **repository owner** account (the same identity accepted by the F1a/F1b build orchestrator for `BUILD_APPROVED`). A PAT from any other account will post the comment successfully but Builder automation will ignore it — see `docs/github-task-status.md` (authorized author = `github.repository_owner`). The dashboard validates token identity via GitHub `/user` and surfaces a configuration error when the login does not match the configured owner.

## Security

- Route is protected by existing admin authentication middleware.
- **Page guard:** `/admin/automation` calls `requireAdminPermissionPage("dashboard.view", "/admin/dashboard")` so direct navigation matches nav and API authorization. Authenticated admins without `dashboard.view` are redirected to the dashboard with a forbidden message; unauthenticated access is handled by existing admin middleware.
- **API guard:** `/api/admin/automation` requires the `dashboard.view` permission via `requireAutomationDashboardPermission()`, matching the nav entry’s `canViewDashboard` intent (401 unauthenticated, 403 without permission).
- Read token is used only in server modules (`server-only`) and the `/api/admin/automation` GET route.
- Write token is used only in server modules and `POST /api/admin/automation/issues/[issueNumber]/approve-build`.
- API responses never include either token or other secrets.
- The only GitHub write action is posting the fixed exact comment `BUILD_APPROVED` on eligible open issues in the configured repo. No merge, deploy, label, or arbitrary comment writes are performed.

## Caching

GitHub responses are cached for 60 seconds via Next.js `unstable_cache` to reduce API usage. Cache keys include the configured repository slug so different `GITHUB_AUTOMATION_REPO` values do not share entries.

## GitHub API strategy

- Status discovery uses **two label-free Search API queries** per cache miss: all open issues, plus date-bounded recently closed issues. GitHub Search does not reliably support OR between `label:` qualifiers, so automation status labels are applied **client-side** after search.
- Open results are filtered to issues carrying one of the configured operational `status:*` labels. Closed history results are filtered to `status:merged` and `status:superseded`.
- Search results paginate until complete (100 items per page, up to 10 pages per query). When GitHub Search returns more than 1000 open repo issues, truncation metadata reflects the search page cap; summary cards mark open counts as partial because exact automation totals are unavailable without scanning every open issue.
- Secondary REST lookups (issue comments, linked PR timeline/detail) use bounded concurrency and tolerate isolated 403/429/5xx failures with partial data.
- If the closed merged/superseded history Search query fails but the open operational query succeeds, the dashboard returns open task data with an explicit partial-data warning instead of collapsing entirely. A failure of the primary open-task Search query remains fatal.
- When open search pagination is truncated, summary cards use loaded automation task counts and mark open metrics as partial (`+` suffix) because additional automation tasks may exist beyond the loaded search pages.
- Linked PR resolution uses REST timeline/pull endpoints and runs only for open, non-terminal tasks.
- Issue comments are fetched via REST; search payloads supply issue metadata directly.
- **BUILD_APPROVED detection** paginates issue comments (100 per page, up to 50 pages) on both the dashboard read path and the approve write path, stopping early when an exact `BUILD_APPROVED` comment is found. This keeps UI eligibility aligned with server-side dedupe on issues with more than 100 comments.

### Approve idempotency and serverless limits

The `Duyệt & chạy` action uses three layers of duplicate protection:

1. **Per-issue in-flight mutex** — concurrent requests in the same serverless instance share one approval promise.
2. **Pre-post comment re-fetch** — the service re-loads paginated comments before posting.
3. **Immediate pre-post re-check** — `postBuildApprovedComment` performs a final paginated comment fetch immediately before the GitHub POST.

**Cross-instance limitation:** Vercel serverless instances do not share in-memory mutexes. Two simultaneous approve requests routed to different instances could both pass the final re-check and post duplicate exact `BUILD_APPROVED` comments. This is rare in practice (requires concurrent clicks across instances within a narrow window) and is **benign downstream**:

- F1a `task-status-build-approved.yml` re-applies `status:approved` idempotently on each authorized comment.
- F1b orchestrator guards (`issue_has_orchestrator_build_approved`, terminal PR markers) prevent duplicate repair triggers and duplicate Builder queue entries when `BUILD_APPROVED` already exists.

No database or Redis lock was added for this narrow write surface; operators should treat duplicate exact `BUILD_APPROVED` comments as harmless if they occur.

## Missing configuration

When `GITHUB_AUTOMATION_READ_TOKEN` is absent, the page renders a graceful empty state with setup instructions instead of failing hard.

## Verification checklist

- [ ] `/admin/automation` requires admin login
- [ ] Missing token shows graceful configuration message
- [ ] Configured token loads tasks with normalized statuses
- [ ] Summary cards and filters work
- [ ] Linked PRs render when GitHub reports `linked:issue-N`
- [ ] Token is not present in client bundle or API JSON
