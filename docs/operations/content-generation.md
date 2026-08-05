# Governed AI Content Engine (Sprint 16.0)

The Content Generation Engine lets editors ask AI to **propose** brief fields,
outlines, section drafts/rewrites, FAQ/CTA/meta copy, and internal-link/media
placements. It never writes to published content, never auto-approves, and
never auto-publishes. A human always reviews and explicitly **Apply**s (or
**Reject**s) every proposal via `src/features/content-generation/`.

This is a distinct, broader surface than the section-only Writing Engine
documented in [`content-ai-generation.md`](./content-ai-generation.md); the
two share the underlying `AiProvider` plumbing but have separate config
namespaces (`CONTENT_GENERATION_*` vs `WRITING_*`).

## Architecture

```
API routes (src/app/api/content/generation/**)
  -> proposal.service (createProposal / applyProposal / rejectProposal / cancelProposal)
    -> policy.ts        (assertGenerationAllowed — enabled / provider / type gates)
    -> context-assembler.service (loads ContentContextBuild.packageJson only —
                                   never queries raw Product/Knowledge tables)
    -> providers/registry (disabled | manual | test | openai)
    -> prompt-registry.ts (versioned system instructions + JSON schemas)
    -> structured-output.service (validates/sanitizes provider output,
                                   rejects unknown factIds/mediaIds/links)
    -> claim-safety.service (blocks MOQ/price/lead-time/factory-ownership/
                              certification/capacity/superlative/guarantee
                              claims that aren't backed by a context fact)
  -> AiGenerationRun (Prisma) — one row per proposal, `proposalStatus` tracks
     REQUESTED → RUNNING → GENERATED|VALIDATION_FAILED|FAILED →
     APPLIED|EDITED_AND_APPLIED|REJECTED|CANCELLED
```

Applying a proposal reuses existing governed write paths — it never invents a
parallel workflow:

- `BRIEF_SUGGESTION` / `OUTLINE_SUGGESTION` → `seo-brief-apply.service`
  (same field-level apply, same "clears approval, never auto-approves"
  behavior as the existing SEO Brief AI flow).
- `SECTION_*` types → `saveHumanEditedSection` in
  `writing-generation-orchestrator.service` (sanitizes HTML, reruns Writing
  QA, locks the section as `USER_EDITED`; draft status can land on
  `REVIEW_READY` or `QA_FAILED` — never auto-approved).
- `META_SUGGESTION` → updates only `metaTitle`/`metaDescription` on the
  `WritingStructuredDraft` (never a published slug).
- `FAQ_SUGGESTION` / `CTA_SUGGESTION` / `MEDIA_SUGGESTION` /
  `INTERNAL_LINK_SUGGESTION` / `ALT_CAPTION_SUGGESTION` → recorded as
  **accepted-only** in this foundation sprint (`proposalStatus=APPLIED` plus a
  note). No automatic write to `MediaAsset` metadata or link tables. Merging
  these into `WritingStructuredDraft.faq`/`cta` safely is left for a follow-up
  sprint (see Known gaps below).

## CONTENT_GENERATION_* environment variables

| Variable | Default | Notes |
|---|---|---|
| `CONTENT_GENERATION_ENABLED` | `false` | Master switch. **Never** inherits from `WRITING_GENERATION_ENABLED` or `AI_SEO_BRIEF_ENABLED` — must be set explicitly. |
| `CONTENT_GENERATION_PROVIDER` | `disabled` | `disabled` \| `manual` \| `openai` \| `test` |
| `CONTENT_GENERATION_MODEL` | falls back to `WRITING_MODEL` / `AI_SEO_BRIEF_MODEL` / `gpt-4o-mini` | |
| `OPENAI_API_KEY` | unset | Required when provider=`openai` |
| `CONTENT_GENERATION_MAX_OUTPUT_TOKENS` | `1200` | |
| `CONTENT_GENERATION_MAX_SECTIONS_PER_RUN` | `3` | |
| `CONTENT_GENERATION_DAILY_LIMIT` | `50` | Workspace-wide hard stop, enforced by `quota-engine.service.ts` against real `AiGenerationRun` totals (see Sprint 18.0 below). |
| `CONTENT_GENERATION_MONTHLY_BUDGET_USD` | unset | Hard stop on `estimatedCostUsd` summed for the current UTC month. |
| `CONTENT_GENERATION_TIMEOUT_MS` | `30000` | |
| `CONTENT_GENERATION_RETRY_LIMIT` | `1` | Capped at 3. |
| `CONTENT_GENERATION_ROLLOUT_STAGE` | `OFF` (or `TEST` when `ENABLED=true` + `PROVIDER=test`) | `OFF` \| `TEST` \| `OPENAI_INTERNAL` \| `OPENAI_EDITOR` \| `OPENAI_ALL` — see Sprint 18.0 below. |
| `CONTENT_GENERATION_DAILY_LIMIT_PER_USER` | `20` | Per-`requestedBy` hard stop. |
| `CONTENT_GENERATION_DAILY_LIMIT_PER_TOPIC` | `10` | Per-topic (`entityId`) hard stop. |

Never commit real API keys. `getContentGenerationSafeStatus()` /
`GET /api/content/generation/status` return `keyConfigured: boolean` only —
never the raw key.

## Human-only approval workflow

1. Editor requests a proposal (`POST /api/content/generation/brief|outline|section`).
2. AI generates → structured output is validated/sanitized →
   `AiGenerationRun.proposalStatus` becomes `GENERATED` (or
   `VALIDATION_FAILED`/`FAILED` if the output failed a safety/schema check).
   **The system never advances a proposal past this point on its own.**
3. A human reviews the proposal and either:
   - `POST /api/content/generation/[id]/apply` — writes the change into the
     destination record via the adapters above (brief/section/meta), or
     records acceptance only (FAQ/CTA/media/link/alt).
   - `POST /api/content/generation/[id]/reject` — marks `REJECTED`, no
     mutation of any draft/brief record.
   - `POST /api/content/generation/[id]/cancel` — only while
     `REQUESTED`/`RUNNING`.
4. Applying is idempotent: re-applying an already-`APPLIED`/
   `EDITED_AND_APPLIED` proposal returns success without side effects.
5. Section proposals are staleness-checked: if the target
   `WritingDraftRecord.version` changed since the proposal was created,
   `apply` throws `GENERATION_STALE`/`APPLY_CONFLICT` instead of silently
   overwriting newer human edits.

## Retrieval boundary

`context-assembler.service.ts` only reads a previously-built
`ContentContextBuild.packageJson` (the existing governed Context Package) plus
`WritingPlanRecord`/`WritingDraftRecord` for section-scoped requests. It never
queries raw `Product`/`Knowledge*` tables directly. Additional governance
filters applied on top of the Context Package:

- **Facts**: excludes anything not `PUBLIC`/`publicOutputAllowed`, and
  excludes statements matching confidential/cost/margin patterns.
- **Media**: excludes assets whose `lifecycleStatus` is
  `ARCHIVED`/`DEPRECATED`/`RETIRED`, or whose `rightsStatus` is not
  `OWNED`/`LICENSED`.

If no completed Context Package exists for the topic, `createProposal` throws
`CONTEXT_NOT_READY` — it never falls back to guessing context from raw tables.

## Claim safety

Every generated section/brief/FAQ text is checked against
`claim-safety.service.ts` before it can reach `GENERATED`. Claims about MOQ,
price, lead time, factory ownership, certifications, capacity, superlatives,
or guarantees are rejected (`UNSAFE_CLAIM`) unless the provider supplied
`factIdsUsed` that resolve against the governed context's fact list.

## Enablement checklist (per environment)

1. Set `CONTENT_GENERATION_ENABLED=true` and `CONTENT_GENERATION_PROVIDER=openai`
   (or `test` for a dry run) on the target Vercel environment only.
2. Set `OPENAI_API_KEY` if not already set for Writing/Brief AI.
3. Redeploy so the Next.js server picks up the new env vars.
4. Confirm `GET /api/content/generation/status` reports
   `enabled: true, provider: "openai", keyConfigured: true`.
5. Smoke-test on **one** low-risk topic: request a `SECTION_DRAFT` for a
   non-pricing/non-MOQ section, review it manually, then Apply.
6. Do not batch-generate all sections/topics on first enablement.

## Rollback

Set `CONTENT_GENERATION_ENABLED=false` (or `CONTENT_GENERATION_PROVIDER=disabled`)
and redeploy. All proposal-creation endpoints immediately throw
`GENERATION_DISABLED`; manual writing/editing continues to work unaffected.
Existing `AiGenerationRun` proposal history is untouched and still viewable
via `GET /api/content/generation/history`.

## Sprint 16.1 — Editor experience

Sprint 16.0 shipped the governed proposal pipeline; Sprint 16.1 makes it feel
like part of the writing surface instead of a separate tool. The writing
surface (`WritingEnginePanel`) stays primary — AI is secondary, inline, and
always optional. This sprint added **no new page/workflow, no migration, and
did not enable `CONTENT_GENERATION_ENABLED`**.

### What changed

- **Inline "✨ AI" menu per section** (`SectionAiMenu`) — a compact button
  that appears on hover/focus of a section row, instead of a chat popup.
  Actions map to the same `ContentGenerationType`s from 16.0 (Viết bản
  nháp/lại, Rút gọn, Mở rộng, Đổi giọng văn, Thêm ví dụ/bảng/FAQ, Gợi ý
  CTA/liên kết/hình ảnh) — see
  `src/features/content-generation/ux/ai-menu-actions.ts`.
- **`SectionProposalPanel`** — an inline panel (never a modal) rendered
  directly under the section row: current content → AI proposal → line/word
  diff (`ProposalDiffView`, `text-diff.ts`) → **Apply / Edit before Apply /
  Retry / Reject**. Apply and Edit-before-Apply are the only actions that
  call `POST /api/content/generation/[id]/apply` — this sprint changed
  nothing about that endpoint's human-only semantics.
- **Transparency widgets** — `ProposalStatusBar` (provider/model/tokens,
  expandable to time/cost/counts — cost shows "Chưa xác định" when unknown,
  never a fabricated number), `ProposalContextChips` (Knowledge/Media/
  Internal Links counts, Brand Rules/Claim Safety indicators, expandable to
  truncated ids — never raw JSON), and `WhyReasoningPanel` (why the AI used
  each fact/media/link, sourced from `factIdsUsed`/suggestion `reason`
  fields).
- **`SectionQualityChips`** — heuristic, network-free SEO/Readability/
  Evidence/CTA/Internal Links/Media signals
  (`ux/section-quality.ts`) to help an editor decide *whether* to ask AI for
  help. These are a cheap client-side hint, not a replacement for the
  governed Writing QA pipeline.
- **Accept-only suggestion UIs** — `InlineMediaSuggestions`,
  `InlineLinkSuggestions`, `InlineCtaFaqProposal` preview suggestions with
  Accept/Insert/Apply buttons that only call a parent callback; consistent
  with the 16.0 "accepted-only" semantics for FAQ/CTA/media/link proposals.
- **`AiGenerationQueue`** — a small non-blocking queue so an editor can fire
  a few section proposals and keep writing/editing other sections while they
  resolve; purely client-side UI state (`useAiWritingQueue`), not a new
  server model.
- **`AiHistoryTimeline`** — renders `GET /api/content/generation/history`
  results (Generated → Applied/Rejected, with draft-version notes) inside
  the writing panel instead of a separate page.
- **`InlineTextAiToolbar`** (P1) — selecting text inside the manual-edit
  textarea shows Rewrite/Explain/Simplify/Professional/Shorter/Longer/Add
  example; each emits a `SECTION_REWRITE` request with an `editorInstruction`
  built from the selection. The result only replaces the selected substring
  in the textarea — the editor still clicks "Lưu & khóa" to persist it
  (still human-in-the-loop, still goes through the governed sanitize/QA path
  on save).
- **Keyboard shortcuts** (`useAiWritingShortcuts`) — Cmd/Ctrl+J opens the AI
  menu, Cmd/Ctrl+Enter generates/applies, Esc cancels/closes — scoped to
  elements marked `data-ai-section-active="true"` so shortcuts never hijack
  typing in unrelated fields.
- **`AiEmptyState`** — "AI chưa được cấu hình. Bạn vẫn có thể tiếp tục viết
  bài bình thường." shown wherever AI is off/unconfigured, replacing the
  previous plain-text hint. Writing is never blocked by AI being off.
- **Streaming architecture placeholder** (`ux/streaming.ts`) —
  `isStreamingEnabled()` always returns `false` today; the shape exists so a
  future streaming provider can be wired in without changing the proposal
  panel's contract.
- **API**: `POST /api/content/generation/section`'s `parseSectionType` now
  also accepts `FAQ_SUGGESTION` / `CTA_SUGGESTION` /
  `INTERNAL_LINK_SUGGESTION` / `MEDIA_SUGGESTION` (previously only the six
  `CONTENT_GENERATION_SECTION_TYPES`), so the inline section menu can request
  these directly from a section's context. Validation, policy gating, and
  claim safety are unchanged — only the allow-list grew.

### What did not change

- **Apply is still human-only.** No new endpoint bypasses
  `proposal.service`'s `GENERATED`-only apply gate or the staleness check
  against `WritingDraftRecord.version`.
- **AI is still OFF by default.** This sprint did not set
  `CONTENT_GENERATION_ENABLED=true` anywhere, and no test in
  `content-generation-16-1.test.ts` calls a paid provider.
- **Review/Handoff/Publish are unchanged** — this sprint only touches the
  Writing Engine step of the pipeline.
- FAQ/CTA/media/link apply remain **accepted-only** (see Known gaps below) —
  16.1 previews them inline but does not add a new write path.

### Known gaps carried into 16.1

- `AiHistoryTimeline`'s "Xem diff" action only lights up when the caller
  already holds the proposal's `output` locally (the list endpoint returns
  safe summaries without `output` to keep history payloads small) — opening
  a diff for an older, no-longer-in-memory history item needs a
  proposal-detail-by-id endpoint, which doesn't exist yet.
- `InlineTextAiToolbar` replaces the selected substring via a plain string
  match against the manual-edit textarea value; if the selection happens to
  repeat elsewhere in the section it edits the first occurrence, not
  necessarily the exact selected range.

## Known gaps / follow-up sprints

- `FAQ_SUGGESTION` and `CTA_SUGGESTION` apply only records acceptance; they
  are not yet merged into `WritingStructuredDraft.faq`/`cta`. Needs a schema
  decision on how FAQ/CTA are represented in the structured draft before
  wiring a real write path.
- `MEDIA_SUGGESTION` / `INTERNAL_LINK_SUGGESTION` / `ALT_CAPTION_SUGGESTION`
  apply only records acceptance; inserting into media-placement or
  internal-link tables still requires a manual editor action.
- Daily-run-limit / monthly-budget enforcement in `policy.ts` is
  placeholder-only — a production usage ledger (aggregating
  `AiGenerationRun` rows) is needed before relying on it as a hard cap.
- Brief-proposal apply always re-reads `run.output` (via
  `seo-brief-apply.service`); inline-edited brief output
  (`applyProposal({ editedOutput })`) is not yet threaded through for brief
  suggestions the way it is for section proposals.

## Sprint 16.2 — Editorial Workspace UX 2.0

Sprint 16.1 made AI assistance feel native to the Writing Engine; Sprint 16.2
reworks the surrounding page (`/admin/content/topics/[id]`,
`SeoTopicDetailClient.tsx`) from a vertical stack of full-width admin cards
into a **document-first** workspace, so the writing canvas — not the admin
metadata — is the visual center of the page. This sprint is UI/IA only: it did
**not** enable AI, call a paid provider, change Review/Handoff/Publish
semantics, add a migration, or introduce a second editor.

### Information architecture

```
Compact document header   (title, keyword, status, progress mini, one primary CTA)
Sticky editor toolbar     (save state, word count, outline toggle, Focus mode)
┌───────────────────────────────┬──────────────────────────┐
│ Outline nav (collapsible)     │ Writing canvas (primary)  │  Context rail
│                                │ id="writing"              │  (Next action,
│                                │ Brief & dàn ý (collapsed) │   Progress, AI,
│                                │ WritingEnginePanel        │   Knowledge, Media,
│                                │   canvasMode              │   SEO/QA, Activity)
│                                │ Chi tiết kế hoạch (collapsed)│
└───────────────────────────────┴──────────────────────────┘
Cài đặt nâng cao (drawer: system IDs, scores, keywords, existing-content match, internal links)
```

Components live under
`src/components/admin/seo-content/topic-workspace/`: `TopicDocumentHeader`,
`TopicEditorToolbar`, `TopicWritingCanvas`, `TopicOutlineNav`,
`TopicContextRail` (with `NextActionModule` / `ProgressModule` /
`AiAssistantModule` / `KnowledgeModule` / `MediaModule` / `SeoQaModule` /
`ActivityModule`), `TopicProjectDetails`, `TopicChecklistSummary`,
`TopicAdvancedDrawer`, `TopicPublishedSummary`, and `TopicMobileSheets`
(bottom sheets for Outline/Context on small screens). Layout and rhythm live
in `TopicWorkspace.module.css`, reusing existing admin design tokens rather
than introducing a new visual theme.

### Primary CTA and progress helpers

`src/features/content/editorial/editorial-ux.ts` gained pure, presentation-only
helpers so the workspace never has more than one primary call-to-action:

- `resolveTopicPrimaryCta({ status, hasActiveReviewId, hasBlogDraft, publishedUrl })`
  returns exactly one `{ label, href, staysOnPage, intent }` per status —
  e.g. **"Tiếp tục viết"** (stays on page, scrolls to the canvas) for
  `DRAFTING`, **"Mở kiểm duyệt"** for `REVIEW` (still routes to
  `/admin/content/reviews[/id]` — the Review workflow itself is untouched),
  and **"Xem bài đã đăng"** for `PUBLISHED`.
- `summarizeChecklistGroups()` compacts the existing checklist items into 5
  groups for the rail/header (Nội dung, SEO, Hình ảnh, Kiểm duyệt, Xuất bản),
  splitting the old single "publish" group into review vs. publish items.
- `buildEditorialProgressSnapshot()` and `deriveSectionEditorialState()`
  produce a richer progress view (word targets, media/CTA/link readiness,
  per-section state chips) but always degrade to `null`/neutral state when
  the underlying data isn't known yet — nothing is fabricated. In particular,
  a section can only be reported "Đã duyệt" when a real
  `reviewApproved: true` is passed in; it is never inferred from QA passing.
- `flattenOutlineForNav()` and `groupEditorialActivity()` are small pure
  helpers for the outline navigator and the rail's activity timeline.
- Focus mode's on/off preference persists via `attd.editor.topicFocus`
  (`readBoolPref`/`writeBoolPref` from `@/features/blog/editor-preferences`,
  the same pattern the Blog editor already uses).

### WritingEnginePanel `canvasMode`

`WritingEnginePanel` gained an optional `canvasMode?: boolean` prop (default
`false`, so the panel is unchanged wherever it's reused outside the new
workspace). In `canvasMode`, generation settings (context build, content
type, "Tạo Writing Plan", plan history) collapse into a single
`<details>` labeled "Cài đặt tạo nội dung", and sections render as plain
document blocks with a derived status chip instead of being wrapped in the
generic collapsible `Section` card. No generate/edit/AI-assistant
functionality was removed — `WritingSectionAiAssistant` and every existing
action are still present, just visually quieter.

### What did not change

- Review, Handoff, and Publish workflows and their API routes/hrefs are
  unchanged; the Review CTA still routes to `/admin/content/reviews`.
- `CONTENT_GENERATION_ENABLED` is not set to `true` anywhere by this sprint,
  and the rail's `AiAssistantModule` always renders the existing
  `AiEmptyState` ("AI chưa được cấu hình…") because `aiConfigured` is passed
  as `false` from the page.
- No new database migration, and no second/parallel editor — `id="writing"`
  still marks the single writing canvas used for scroll targets.
- All existing state, data loading, and save handlers in
  `SeoTopicDetailClient.tsx` were preserved; this sprint only restructured
  the JSX returned by the component.

### Known gaps

- `WritingEnginePanel` still owns the active review id and live draft
  word/section counts locally and does not lift them up to the parent yet,
  so `resolveTopicPrimaryCta`/`buildEditorialProgressSnapshot` are called
  with `hasActiveReviewId: null` and fall back to status-derived data rather
  than the panel's live counts. Lifting that state up is a follow-up.
- `TopicContextRail`'s `KnowledgeModule` links out to the existing Knowledge
  surface rather than embedding a live `ContentContextPanel`, to avoid
  duplicating that panel's data-fetching inside the rail in this sprint.

## Sprint 18.0 — Governed production enablement (TEST-only rollout default)

Sprint 18.0 turns the daily/monthly limits from Sprint 16.0 into a real,
DB-backed hard-stop, adds a **staged rollout gate** so `CONTENT_GENERATION_ENABLED=true`
can ship safely with zero OpenAI exposure, and adds usage/cost visibility,
proposal detail/timeline, retry, and rollback. It does **not** change any
apply/review/handoff/publish mutation semantics, and does **not** add a
migration — everything reuses `AiGenerationRun`'s existing columns
(`warnings`/`inputSummary` as structured JSON) plus new pure/read-only
services.

### Rollout stages

`CONTENT_GENERATION_ROLLOUT_STAGE` is a gate independent from
`CONTENT_GENERATION_ENABLED`/`CONTENT_GENERATION_PROVIDER`:

| Stage | TEST provider | OPENAI provider |
|---|---|---|
| `OFF` (default) | ❌ | ❌ |
| `TEST` | ✅ | ❌ |
| `OPENAI_INTERNAL` / `OPENAI_EDITOR` / `OPENAI_ALL` | ✅ | ✅ (still requires `OPENAI_API_KEY`) |

`assertRolloutAllowsProvider` (`contracts/policy.ts`) enforces this before
every proposal creation, in addition to the existing enabled/provider/type
checks. **OpenAI remains unreachable until an operator explicitly moves the
stage past `TEST` — this sprint ships with `TEST` as the de-facto production
default** (`CONTENT_GENERATION_ENABLED=true` + `CONTENT_GENERATION_PROVIDER=test`
resolves to `rolloutStage=TEST` even without setting the env var explicitly).

### Usage ledger, cost engine, quota engine

- **`cost-engine.service.ts`** — static USD/1k-token rate table for
  OpenAI/Claude/Gemini models (TEST is always $0). `estimateGenerationCost()`
  is a pure function; `createProposal` calls it as a fallback whenever a
  provider's own usage payload doesn't already include a cost. Unknown
  provider/model pairs return `estimatedCostUsd: null, rateTableAvailable:
  false` — never a fabricated number.
- **`usage-ledger.service.ts`** (+ `usage-ledger.mapping.ts` for the
  Prisma-free aggregation logic) — `getUsageLedgerSummary()` powers
  `GET /api/content/generation/usage` (today/month totals, top users/topics,
  status counts); `getUsageForWorkspaceToday`/`getUsageForUserToday`/
  `getUsageForTopicToday` back the quota engine.
- **`quota-engine.service.ts`** — `assertQuotaAllowed()` is called from
  `createProposal` right before the provider call (only when
  `quotaUsageDeps` is wired — see `createLedgerQuotaUsageDeps` in
  `proposal.wiring.ts`). Enforces, in order: workspace daily limit, monthly
  budget, per-user daily limit, per-topic daily limit — each throws
  `ContentGenerationError` (`DAILY_LIMIT` / `MONTHLY_BUDGET_EXCEEDED`) with a
  Vietnamese message. This **replaces** the "placeholder-only" limitation
  called out in the Sprint 16.0 known-gaps section above.

### Selection offsets + stale detection

Section-scoped generation requests may include an optional
`selection: { start, end, textHash, draftVersion }`, persisted into
`AiGenerationRun.inputSummary.selection`. At apply time,
`stale-check.ts`'s `assertSelectionNotStale()` rejects the apply with
`GENERATION_STALE` if either the draft version captured at proposal-creation
time, *or* the finer-grained selection's `draftVersion`, no longer matches
the current `WritingDraftRecord.version` — preventing an AI proposal from
silently overwriting a newer human edit.

### Rollback (no schema change)

Before `applySectionProposalAdapter` overwrites a section via
`saveHumanEditedSection`, it captures a `RollbackSnapshot` (previous
html/plainText/version) and returns it in the apply result. `applyProposal`
then persists it into `AiGenerationRun.warnings` (via
`run-warnings.ts`'s `withRollbackSnapshot` — the column stays backward
compatible: readers that expect the legacy `string[]` shape still get a
`messages: string[]` via `normalizeRunWarnings`). `POST
/api/content/generation/[id]/rollback` restores that exact html through the
same governed `saveHumanEditedSection` path — it is a content operation, not
a new proposal-lifecycle state (the proposal itself stays
`APPLIED`/`EDITED_AND_APPLIED`).

### Retry

`POST /api/content/generation/[id]/retry` creates a **brand-new** proposal
from a prior run's type/topic/section/context/editorInstruction
(`retry-mapping.ts`'s `mapPriorRunToRetryInput`) — it never mutates or
replaces the original run. Both runs are cross-linked via
`retryOfRunId`/`retriedByRunId` in `warnings`. The new proposal goes through
the exact same governance gates (policy, quota, claim safety) as any other
proposal creation.

### New read APIs

- `GET /api/content/generation/usage` — usage ledger summary.
- `GET /api/content/generation/[id]` — safe proposal detail: output,
  `inputSummary`, latency, status timeline (`proposal-detail.service.ts`),
  rollback availability/snapshot, retry links.
- `GET /api/content/generation/providers/status` — provider health snapshot
  (`available`, `keyConfigured: boolean` only, recent run/failure counts,
  avg latency, last success/failure) — never a secret.
- `GET /api/content/generation/status` now also returns `rolloutStage`,
  `dailyLimitPerUser`, `dailyLimitPerTopic`, and `todayUsage`/`monthUsage`
  snapshots from the ledger.

### Admin UI

- `/admin/content/ai` (`ContentAiAdminClient`) — provider settings, rollout
  stage, quota/limits, provider health, usage dashboard (today/month, top
  users/topics, status counts), and a read-only prompt-registry summary.
- `/admin/content/generation/[id]` (`ContentGenerationDetailClient`) —
  original/proposal diff (reuses `ProposalDiffView` against the rollback
  snapshot when available), context usage counts, provider/cost/latency,
  status timeline, and Retry/Rollback actions.
- `WritingEnginePanel`'s header shows a compact rollout-stage badge + "today"
  usage snapshot with a link to `/admin/content/ai`, next to the existing
  `AiEmptyState` fallback.
- Nav: **NỘI DUNG → AI vận hành** (`/admin/content/ai`).

### What did not change

- Apply/Reject/Cancel semantics and the human-only approval workflow
  documented above are unchanged. Retry and Rollback are additive
  operations on top of the same governed write paths — neither auto-applies
  a proposal.
- No new database migration — rollback snapshots and retry links live in
  the existing `warnings`/`inputSummary` JSON columns.
- OpenAI wiring remains off by default; every test in
  `content-generation-18-0.test.ts` runs against the pure services above
  with in-memory fixtures — no paid provider is ever called.

## Sprint 18.1 — Governed AI pilot rollout (TEST-only default, smoke workspace)

Sprint 18.1 adds an operational readiness layer on top of 18.0's rollout
gate: a smoke-test workspace, a well-known never-published AI test topic, a
TEST-only Failure Lab, audit-only quality review, provider comparison, and
richer cost/prompt-evaluation dashboards. **No mutation safeguard changes**
— nothing here can auto-apply/auto-review/auto-handoff/auto-publish, and no
new database migration was added (everything reuses `AiGenerationRun`'s
existing `warnings` JSON column, same pattern as 18.0's rollback/retry
links).

### AI Smoke Workspace (`/admin/content/ai/smoke`)

- `GET /api/content/generation/smoke` — read-only prerequisites/status:
  provider health, rollout stage, rollout readiness forecast, quota
  snapshot, usage snapshot, and whether the AI test topic exists.
- `POST /api/content/generation/smoke` — runs 7 read-only checks
  (`smoke-check.service.ts`'s `runSmokeChecks`), each classified
  PASS/WARNING/FAIL: Health, Quota gate presence, Provider config safe,
  Prompt registry available, Context retrieval ready, Ledger write
  capability, Retry/rollback route availability. With `{ mode: "simulate" }`
  it additionally runs the Failure Lab scenarios below (still read-only for
  the checks; simulations touch no DB row). Missing prerequisites (e.g. no
  test topic yet) resolve to WARNING, never a request failure.

### AI test topic (never published)

`ai-test-topic.service.ts` manages a single, well-known `SeoTopic`
(`slug: "ai-test-smoke-topic"`, title prefixed `[AI TEST]`) used only to
exercise the pipeline:

- `ensureAiTestTopic()` — idempotent create-or-find. Picks the first
  available `SeoTopicCluster`; if the workspace has zero clusters, it
  returns a warning and creates nothing (never cascades into creating a
  cluster/strategy).
- `getAiTestTopic()` — read-only lookup.
- `isAiTestTopicSafe()` — a checkable invariant: `status: DRAFTING`,
  `targetUrl`/`existingUrl`/`publishedAt` all `null`, and both the
  `[AI TEST]` title marker and `ai-test-` slug prefix present. Exposed via
  `POST /api/content/generation/smoke/test-topic`'s `neverPublished` field.

### Rollout readiness forecast (still human-gated)

`getRolloutReadinessSummary()` (`contracts/policy.ts`) is a **read-only
forecast**, distinct from the currently-active `rolloutStage`: it reports
whether TEST and OPENAI_INTERNAL are technically eligible (master switch
on; OpenAI additionally needs `apiKeyConfigured`). It always returns
`autoAdvanceAllowed: false` and `requiresHumanApprovalBeyondTest: true` —
this sprint adds **no** code path that moves `rolloutStage` automatically;
an operator must still set `CONTENT_GENERATION_ROLLOUT_STAGE` explicitly.
Surfaced in `GET /api/content/generation/status` and the AI admin page's
new **"OPENAI Internal Pilot Readiness"** block (key configured?, stage,
provider health, a persistent warning banner).

### Failure Lab (TEST provider only, in-memory)

`failure-lab.service.ts` proves the safety nets work, without ever calling
OpenAI or writing an `AiGenerationRun` row:

| Scenario | How it's proven |
|---|---|
| `timeout` / `provider_error` | TEST provider's magic-token throws the expected `ContentGenerationError` code. |
| `malformed` | TEST provider returns a malformed payload; PASS requires `structured-output.service.ts` to reject it with `INVALID_PROVIDER_OUTPUT`. |
| `quota_exceeded` | `assertQuotaAllowed` is called with strict **in-memory** mock limits/usage (never the real ledger) — PASS means it still throws `DAILY_LIMIT`. |
| `invalid_key` | Readiness-only: checks `apiKeyConfigured`, never calls OpenAI to validate the key. |

Provider-based scenarios run against `buildSyntheticSmokeContext()` — a
fabricated `GovernedGenerationContext` for the AI test topic — so Failure
Lab never depends on a real Content Context Build existing.

### Quality review (audit-only)

`POST /api/content/generation/[id]/quality` validates a `{ rating: 1-5,
helpful?, needsRewrite?, wrongFacts?, tooVerbose?, note? }` payload
(`quality-feedback.ts`) and merges it into
`AiGenerationRun.warnings.qualityFeedback` (`run-warnings.ts`'s
`withQualityFeedback`) — preserving every other warnings key. **Never**
changes `proposalStatus` or triggers any apply/publish path. Submitted from
a star-rating + checkbox form on the proposal detail page.

### Provider comparison (read-only)

`buildProviderComparison()` (`proposal-detail.service.ts`) compares the
current run against the most recent run for the **same
topic+section+type** but a **different provider**, if one exists —
tokens/latency/cost plus a one-line diff summary. The DB lookup
(`getProposalProviderComparison`, wired into `GET
/api/content/generation/[id]` as `providerComparison`) is read-only and a
lookup failure never fails the whole request (falls back to `null`).

### Rollback now leaves a marker

`rollbackContentProposal` additionally persists `warnings.rolledBackAt`
(`run-warnings.ts`'s `withRolledBackAt`) after a successful rollback — used
only by the prompt-evaluation rollback rate below. It still never changes
`proposalStatus`.

### Cost dashboard + prompt evaluation metrics

- `getUsageLedgerSummary()` now also returns `week` (Monday-start UTC) next
  to `today`/`month`, and `promptVersionMetrics` — per-`promptVersion`
  acceptance rate (`applied / generated`), retry rate
  (`retriedByRunId` presence), rollback rate (`rolledBackAt` presence /
  applied), and average quality rating, computed by
  `prompt-metrics.ts`'s pure `computePromptVersionMetrics()`. The AI admin
  page renders average tokens/latency cards for today/week/month and a
  "top prompt version" table (sorted by volume) from this same field.
- `GET /api/content/generation/usage/export?format=csv|json` —
  admin-only, read-only export (`usage-export.ts`) with columns
  `id, requestedBy, provider, model, totalTokens, estimatedCostUsd, status,
  proposalStatus, createdAt, startedAt, completedAt`. Capped at 5,000 most
  recent rows.

### Navigation

- New page: `/admin/content/ai/smoke` (breadcrumb: NỘI DUNG → AI vận hành
  → Smoke Workspace).
- The AI admin page (`/admin/content/ai`) links to it via an "Mở AI Smoke
  Workspace" button.

### What did not change

- Every mutation safeguard from 16.0/18.0 is unchanged: AI still only ever
  proposes; apply/review/handoff/publish all remain human-triggered.
  Nothing added in 18.1 calls `applyProposal`, the review-approval
  pipeline, blog handoff, or any publish path — the only new mutations are
  the audit-only quality-feedback merge and the rollback marker, both
  confined to `AiGenerationRun.warnings`.
- No new database migration.
- `CONTENT_GENERATION_ROLLOUT_STAGE` still defaults to `OFF` unless
  explicitly set (or `ENABLED=true` + `PROVIDER=test`, which resolves to
  `TEST` per 18.0) — 18.1 adds zero code paths that write this env-derived
  value or auto-advance it.
