# Content Operations Command Center — operations guide

Sprint 17.0 adds `/admin/content/operations` — a **read-only** operational cockpit for
Head of Content / SEO Manager / Editor Lead. It aggregates existing SeoTopic,
Brief, Content Review and Publish data into one screen. It does not change any
governed semantics.

## Read-only guarantee

- No workflow mutation endpoints. `GET /api/content/operations/summary` is the
  **only** route this sprint adds, and it has no `POST`/`PUT`/`PATCH`/`DELETE`
  export.
- The mapping module (`content-operations.mapping.ts`) contains only pure,
  deterministic functions — no Prisma import, no fetch, no writes.
- The server service (`content-operations.service.ts`) only reads
  `SeoTopic` / `SeoContentBrief` / `WritingPlanRecord` / `WritingDraftRecord`
  and reuses the existing `listContentReviews` / `listPublishingQueue`
  read-only services. It never calls `update`, `create`, `delete`, or any
  status-transition function.
- Drag-and-drop in the Kanban board is a **cursor-grab placeholder only**.
  `onDragStart` calls `preventDefault()` and shows the toast
  *"Kéo thả chưa đổi trạng thái trong sprint này"* — it never calls a
  status-transition API.
- AI content generation is untouched: no operations file sets
  `CONTENT_GENERATION_ENABLED=true`, and the command center never calls the
  content-generation provider.
- No Prisma migration was added or required — every field already existed on
  `SeoTopic` / `SeoContentBrief`.

## Pipeline mapping

Seven display-only pipeline columns, mapped from the existing `SeoTopicStatus`
enum (extends the editorial calendar's pipeline with a dedicated QA column):

| Column | Label | Source status |
|---|---|---|
| `ideas` | Ý tưởng | `IDEA`, `RESEARCHING`, `PAUSED`, `REJECTED` |
| `brief` | Brief | `APPROVED`, `BRIEF_READY` |
| `writing` | Đang viết | `DRAFTING` without a target URL and without a QA-failed draft |
| `qa` | QA | `DRAFTING` with the latest Writing Draft `status = QA_FAILED` |
| `review` | Kiểm duyệt | `REVIEW` without a target URL |
| `ready` | Sẵn sàng | `REVIEW` or `DRAFTING` with a target URL set |
| `published` | Đã xuất bản | `PUBLISHED` |

`ARCHIVED` topics are excluded from the board entirely (terminal, not actionable).
`PAUSED` / `REJECTED` topics land in **Ideas** and are also flagged `blocked: true`
on the card so they read as a distinct badge, not a false "just an idea" state.

### QA column caveat

The QA column depends on a light join: for topics currently `DRAFTING`, the
service looks up the topic's `WritingPlanRecord` → latest `WritingDraftRecord`
and checks `status === "QA_FAILED"`. When no Writing Draft exists yet, `qaFailed`
is `null` (not inferred), and the topic falls into **Đang viết** instead. This
join is bounded to the DRAFTING slice of the loaded topic page, not the whole
table.

## Health, refresh, and coverage signals

All of the following are computed the same way from the same `OpsTopicCard[]`
list, so counts always agree between the Health grid and the topic list filters:

- **Thiếu CTA / Meta / Hình ảnh / FAQ** — brief `ctaText`/`ctaType`, brief
  `metaTitle`/`metaDescription`, `mediaBundleId`/`mediaPlanStatus`, and brief
  `questions` respectively.
- **Quá hạn** — `dueDate` before today and status not `PUBLISHED`/`ARCHIVED`.
- **Cần làm mới** — `PUBLISHED` topics only, flagged when published more than
  180 days ago **or** missing any of the signals above **or** `mediaPlanScore`
  is below 50. A recently published topic is excluded unless it is missing a
  signal.

## No workflow changes

This sprint intentionally does **not**:

- Add or change any Prisma model or run a migration.
- Add a status-transition, approval, publish, or AI generation endpoint.
- Change the meaning of Topic / Brief / Writing / Review / Publish / Media /
  Knowledge statuses defined by earlier sprints.
- Enable AI content generation (`CONTENT_GENERATION_ENABLED` stays whatever
  the environment already had it as).

## Navigation

`Trung tâm vận hành` is registered under **NỘI DUNG**, right after **Dashboard**,
requiring `canManageCms` — the same permission gate as the rest of the content
domain.

---

# Sprint 17.1 — Operational Queues & Audit Foundation

Sprint 17.1 upgrades the command center from dashboard summaries into denser,
group-based operational inboxes (review / publish / refresh), a server-ranged
calendar, and a derived audit trail — **still strictly read-only**, still no
new database table.

## New inboxes

| Inbox | Endpoint | Groups | Notes |
|---|---|---|---|
| Review | `GET /api/content/operations/reviews` | `high_priority`, `waiting_today`, `overdue`, `recently_submitted` | Additive triage buckets (Gmail-style) — one review can land in more than one group. Wraps `listContentReviews`, joined with topic priority/owner/campaign/cluster. |
| Publish | `GET /api/content/operations/publish` | `ready_today`, `scheduled`, `failed`, `waiting`, `published_today` | Merges every `listPublishingQueue` kind (ready, scheduled, failed, recent) plus content-modified-after-handoff detection. |
| Refresh | `GET /api/content/operations/refresh` | machine-readable `reasons[]` per card (`outdated`, `missing_cta`, `missing_faq`, `missing_hero`, `missing_links`, `missing_images`, `low_seo`) | `PUBLISHED` topics only, sorted worst-first by a severity score, then oldest-first. Not subject to the 800-row command-center cap — `status: PUBLISHED` is already a narrow predicate. |

Each inbox also exposes a `QueueHealth` (`total`/`blocked`/`overdue`/`waiting`/`completedToday`)
and/or aggregate rollups (`ReviewerWorkload`, `PublishOpsStats`, `RefreshCampaign`,
`EditorWorkload`) via pure mapping functions in `content-operations.mapping.ts` —
the UI computes these client-side from the same inbox payload, no extra
governed queries.

## Calendar range query

`GET /api/content/operations/calendar?from=&to=&view=month|week|agenda` runs a
targeted `dueDate`/`publishedAt` range query — **not** limited to the 800-row
command-center topic page, so publish targets outside the "top 800 most
recently updated" slice still show up on the calendar. Bounded to 2,000 rows
per range with a `truncated: true` flag instead of a hard stop. The UI
(`OperationsCalendar.tsx`) re-fetches whenever the visible month/week/agenda
window changes.

## Derived audit trail (no new table)

There is intentionally **no** `ContentOperationEvent` table and no migration.
`GET /api/content/operations/activity` (feed) and
`GET /api/content/operations/topic/[id]/timeline` (single-topic timeline) are
both computed on read by merging rows from tables that already exist:

- `ContentReviewDecision` → review approve/reject/handoff events
- `ContentPublishEvent` → publish/schedule/unpublish/failure events
- `ContentHandoffRecord` → writing-draft → blog handoff events
- `AiGenerationRun` / `WritingGenerationRun` → AI generation attempts
- `WritingDraftVersion` → draft created/updated events

`content-operations-activity.mapping.ts` normalizes every row shape into one
`OpsActivityEvent` (`kind`, `actorId`, `topicId`, `href`, Vietnamese `text`,
`sourceTable`). The service resolves topic context via a handful of bounded
`WritingPlanRecord` → `SeoTopic` lookups (not a fan-out per row), then:

- `getOperationsActivityFeed({ take })` merges all sources, newest-first, capped.
- `getTopicOperationsTimeline(topicId)` unions every source for one topic,
  chronological (oldest → newest), for the `OperationsTopicTimeline` drawer.

## Deep links

`buildDeepLink(filterKey)` turns a single key into a shareable
`/admin/content/operations` URL:

- `"review:overdue"` → `?inbox=review&group=overdue`
- `"publish"` → `?inbox=publish`
- `"missingCta"` (an existing health-metric key) → `?inbox=kanban&filter=missingCta`

`ContentOperationsClient.tsx` reads these query params once on mount (plain
`URLSearchParams` over `window.location.search` — no `next/navigation`
`useSearchParams`, so no Suspense boundary is required for this client-only,
no-SSR-data page) and keeps the URL in sync via `history.replaceState` as the
user clicks health metrics, switches inbox tabs, or applies a saved view.

## Named views

`content-operations-views.ts` persists named views (`inbox` tab + facet
`filters` + optional `group`) to `localStorage` under `attd.ops.namedViews`.
Four built-in defaults ("Kiểm duyệt hôm nay", "Làm mới SEO", "Bản nháp của
tôi", "Xuất bản hôm nay") are always present and can never be overwritten or
deleted; custom views are user-created only, best-effort persistence (a
`localStorage` failure never blocks the UI).

## Read-only guarantee (unchanged, extended)

- All six new routes (`reviews`, `publish`, `refresh`, `calendar`, `activity`,
  `topic/[id]/timeline`) are `GET`-only, gated by
  `requireAdminPermission({ platform: "content", action: "read" })`, with no
  `POST`/`PUT`/`PATCH`/`DELETE` export.
- Every new service function is `findMany`/`findUnique` only — no `create`,
  `update`, `upsert`, or `delete`.
- The Kanban board's drag-and-drop placeholder and the "no `CONTENT_GENERATION_ENABLED`"
  guarantee from 17.0 are unchanged and re-verified by the 17.1 test suite.

## Known gaps

- The calendar's date-range query does not currently apply the kanban's facet
  filters (owner/campaign/priority/etc.) — it is scoped by date range only.
  Search and facet filters still apply to the Kanban board and to the
  review/publish/refresh inbox rows client-side.
- The publish inbox's `group` deep link scrolls to that group's section
  (publish groups are not mutually exclusive tabs like the review inbox);
  only the review inbox supports an exclusive active-group tab view.
- `internalLinkCount` (used for the `missing_links` refresh reason) is only
  populated by the refresh inbox's dedicated query (`fetchRefreshTopicRows`);
  it stays `undefined` on every other `OperationsTopicInput` the service
  builds, since only the refresh-inbox path ever reads it.
