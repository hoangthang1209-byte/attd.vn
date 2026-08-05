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
