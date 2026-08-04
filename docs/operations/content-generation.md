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
| `CONTENT_GENERATION_DAILY_LIMIT` | `50` | Placeholder gate; full usage-ledger enforcement is a follow-up. |
| `CONTENT_GENERATION_MONTHLY_BUDGET_USD` | unset | |
| `CONTENT_GENERATION_TIMEOUT_MS` | `30000` | |
| `CONTENT_GENERATION_RETRY_LIMIT` | `1` | Capped at 3. |

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
