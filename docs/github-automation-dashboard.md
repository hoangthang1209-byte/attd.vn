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
| `GITHUB_AUTOMATION_REPO` | No | Repository in `owner/repo` form. Defaults to `hoangthang1209-byte/attd.vn`. |

### Minimum token permissions

Use a fine-grained or classic PAT with **read-only** access:

- Issues: Read
- Pull requests: Read
- Metadata: Read (required by GitHub API)

Do not grant write, admin, or workflow permissions for this dashboard.

## Security

- Route is protected by existing admin authentication middleware.
- **Page guard:** `/admin/automation` calls `requireAdminPermissionPage("dashboard.view", "/admin/dashboard")` so direct navigation matches nav and API authorization. Authenticated admins without `dashboard.view` are redirected to the dashboard with a forbidden message; unauthenticated access is handled by existing admin middleware.
- **API guard:** `/api/admin/automation` requires the `dashboard.view` permission via `requireAutomationDashboardPermission()`, matching the nav entry’s `canViewDashboard` intent (401 unauthenticated, 403 without permission).
- Token is used only in server modules (`server-only`) and the `/api/admin/automation` route.
- API responses never include the token or other secrets.
- No GitHub write/merge actions are performed.

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

## Missing configuration

When `GITHUB_AUTOMATION_READ_TOKEN` is absent, the page renders a graceful empty state with setup instructions instead of failing hard.

## Verification checklist

- [ ] `/admin/automation` requires admin login
- [ ] Missing token shows graceful configuration message
- [ ] Configured token loads tasks with normalized statuses
- [ ] Summary cards and filters work
- [ ] Linked PRs render when GitHub reports `linked:issue-N`
- [ ] Token is not present in client bundle or API JSON
