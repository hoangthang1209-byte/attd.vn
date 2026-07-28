# Content Performance — operations guide

Sprint 13.4 adds a governed **Hiệu quả nội dung** workspace for post-publication editorial feedback.

## Supported sources

| Source | Status in CMS | What it provides |
|--------|---------------|------------------|
| Google Search Console | **Not connected** | Would provide impressions, clicks, CTR, average position |
| Google Analytics 4 | **Partial** when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set | Client-side events only — CMS does **not** query the GA Data API |
| Internal editorial signals | **Connected** | Publish date, content age, word/image counts, CTA detection, SeoTopic internal links |
| CRM / Dealer attribution | **Partial** | Deterministic match of `landingPage` containing `/blog/{slug}` |

Unavailable metrics are returned as `null` and rendered as “Chưa kết nối” / “—”. They are **never** coerced to zero.

## Connection requirements

### Search Console
Not implemented in this repository. Future work needs a secure OAuth or service-account pattern, property verification, and batched page queries with caching.
Setup/runbook: `docs/operations/google-search-console.md`.

### Analytics
Environment variable (name only):

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Having this ID enables public site tracking. It does **not** unlock CMS engagement numbers until a server-side GA Data API integration is added.

### CRM attribution
Uses existing `DealerLead.landingPage` and `Lead.landingPage`. No CRM records are mutated. Attribution hierarchy:

1. Explicit content/blog ID in event (not stored today)
2. Landing URL containing `/blog/{slug}`
3. UTM-only is **not** used alone
4. Timestamp-only matching is **forbidden**

## Data freshness

Each source reports `FRESH | DELAYED | STALE | UNAVAILABLE`.

Internal/CRM aggregates are queried on demand with a short in-memory cache (~60s) and do not spawn uncontrolled cron jobs.

## Definitions

- **Published articles**: `BlogPost.status = PUBLISHED`
- **Qualified leads**: attributed DealerLead + Lead counts for matching landing URLs in the selected period
- **Average position**: Search Console definition only — never a ranking guarantee (null until GSC is connected)
- **Refresh status**: deterministic rules in `content-refresh-engine.ts`

## Refresh rules (summary)

- `NEW`: published within observation window (default 14 days)
- `HEALTHY`: no warning signals
- `WATCH` / `UPDATE_RECOMMENDED` / `URGENT`: stale update age, missing CTA, missing internal links, low word count, and measured search/engagement rules when sources are connected
- `INSUFFICIENT_DATA`: no measured external signals and no editorial warnings

Search rules (CTR, position 4–15, click decline) require non-null measured values.

## Disconnect behavior

The workspace remains useful without GSC/GA:

- published inventory
- content age / freshness
- CTA / internal-link / image health
- connection checklist under `/admin/content/performance/settings`

Primary CTA when disconnected: **Kết nối nguồn dữ liệu**.

## Privacy

- No credentials in API responses
- No personal analytics identifiers
- No article bodies in list/summary responses (word/image counts computed server-side)
- No CRM contact details in performance payloads

## Troubleshooting

1. Metrics show “Chưa kết nối” for clicks/impressions → expected until GSC is integrated.
2. Leads stay 0 → confirm `landingPage` on leads includes `/blog/{slug}`.
3. Topic link missing → Blog↔SeoTopic is soft (`targetEntityId` / target URL); ensure handoff set the link.
4. Infinite loading → APIs use bounded timeouts via the same dashboard fetch helper as Hotfix 13.1.1.

## Operating cadence (recommended)

- Weekly: review **Cơ hội tối ưu** and refresh queue
- Monthly: strategy/cluster performance after GSC is connected
- After publish: wait observation window before treating low traffic as failure
