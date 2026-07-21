# Content publishing & cron

Governed Blog publishing supports:

1. **Immediate publish** — human action in Blog editor with readiness recompute + confirmation checkbox.
2. **Scheduled publish** — requires cron secret + `vercel.json` cron route.

Scheduling is **optional** for the first Content Revenue Launch article. Immediate publish remains available when cron is not configured.

## Secrets (never commit)

Generate a long random secret, for example:

```bash
openssl rand -hex 32
```

Set **one** of:

- `CONTENT_PUBLISH_CRON_SECRET` (preferred)
- `CRON_SECRET` (fallback)

In Vercel → Project → Settings → Environment Variables → Production (and Preview if needed). Redeploy after changes.

## Cron route

Declared in `vercel.json`:

- Path: `/api/internal/content/publish-due`
- Schedule: `0 17 * * *` (daily)

Handler auth: `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.

If the secret is unset, the route returns **503** and scheduling is inactive. Immediate publish is unaffected.

## Safe manual call (ops only)

```bash
curl -X POST "https://www.attd.vn/api/internal/content/publish-due" \
  -H "Authorization: Bearer $CONTENT_PUBLISH_CRON_SECRET"
```

Do not paste production secrets into tickets, commits, or chat logs.

## Verify

1. `/admin/content/launch` → Publishing and cron section:
   - Route registered
   - Cron schedule declared
   - Secret configured (boolean only)
   - Last successful due-processor run (from `ContentPublishEvent`, if any)
2. `/admin/content/publishing` queue for scheduled posts.
3. After a due run, inspect publish events for `requestedBy` containing `publish-due`.

## Troubleshoot failed schedules

- Secret missing → 503; set env + redeploy.
- Post not due yet → check `scheduledAt`.
- Readiness failed → fix Blog readiness checks; do not bypass confirmation.
- Hobby plan cron limits → confirm Vercel cron executed.

## Disable scheduling

1. Clear scheduled posts via cancel-schedule API / UI.
2. Remove or rotate cron secret and redeploy, **or** leave secret unset.
3. Keep immediate publish for explicit human releases.

## Launch rule

Do not claim scheduling is operational until secret + successful due run are verified on the launch dashboard.
