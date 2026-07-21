# Content AI generation (Writing Engine)

Governed section generation is **optional**. Manual draft entry, QA, review, Blog handoff and immediate publish work without a provider.

## Required Vercel environment variables

| Variable | Default | Notes |
|---|---|---|
| `WRITING_GENERATION_ENABLED` | `false` | Master switch. Keep `false` until ready. |
| `WRITING_PROVIDER` | `openai` | `openai` or `fake` (tests / dry runs) |
| `WRITING_MODEL` | project default | Configurable; do not hardcode in app code for launch |
| `OPENAI_API_KEY` | unset | Required when provider=`openai` and enabled |

Optional cost / safety controls:

- `WRITING_MAX_OUTPUT_TOKENS_PER_SECTION`
- `WRITING_MAX_SECTIONS_PER_RUN`
- `WRITING_MAX_PARALLEL_SECTIONS`
- `WRITING_DAILY_RUN_LIMIT`
- `WRITING_MONTHLY_BUDGET_USD`
- `WRITING_TIMEOUT_MS`
- `WRITING_MAX_RETRIES`

Never commit real API keys.

## Preview / Production scope

Set variables on **Production** (and Preview if you intentionally test AI there).

After changing env vars on Vercel: **redeploy** so Next.js server processes pick up the values.

## Verify provider status

1. Open `/admin/content/launch` → section **AI generation configuration**.
2. Or `GET /api/content/writing-generation/status` (admin session).
3. Confirm `enabled`, `provider`, `model`, `configured` — **never** expect the raw key in responses.

## Disable generation immediately

Set `WRITING_GENERATION_ENABLED=false` and redeploy.

Manual workflow remains available.

## One-section smoke procedure

1. Create Writing Draft shell from an approved Context + Plan.
2. Select **one** low-risk section (Introduction or material guidance).
3. Avoid first runs on pricing, MOQ, lead time, certifications, customer names, factory ownership.
4. Review tokens / cost estimate UI when available; otherwise treat cost as “Chưa xác định”.
5. Lock section → run QA → human review.

Do **not** generate all sections automatically on first launch.

## No-key / manual fallback

If provider is disabled or key missing, the launch dashboard shows:

> AI chưa được cấu hình. Bạn vẫn có thể nhập nội dung thủ công.

Provider configuration is **not** a publishing dependency.
