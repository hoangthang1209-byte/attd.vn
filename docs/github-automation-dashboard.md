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
- `/api/admin/automation` requires the `dashboard.view` permission, matching the nav entry’s `canViewDashboard` intent.
- Token is used only in server modules (`server-only`) and the `/api/admin/automation` route.
- API responses never include the token or other secrets.
- No GitHub write/merge actions are performed.

## Caching

GitHub responses are cached for 60 seconds via Next.js `unstable_cache` to reduce API usage. Cache keys include the configured repository slug so different `GITHUB_AUTOMATION_REPO` values do not share entries.

## GitHub API strategy

- Status discovery uses **two consolidated Search API queries** per cache miss (open operational labels + date-bounded closed merged/superseded history), not one query per status label.
- Search results paginate until complete (100 items per page, up to 10 pages per query).
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
