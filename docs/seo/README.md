# Marketing / Content / SEO Lane

Phase 1 planning artifacts for [Issue #99](https://github.com/hoangthang1209-byte/attd.vn/issues/99).

| Document | Purpose |
|---|---|
| [technical-seo-audit.md](./technical-seo-audit.md) | Current-state technical SEO review |
| [content-architecture.md](./content-architecture.md) | Information architecture + keyword/intent map |
| [content-backlog.md](./content-backlog.md) | Prioritized SEO/content implementation backlog |

## Scope guardrails

- Public marketing routes only — no CRM, auth, pricing, payments, or admin business logic changes in this lane.
- Preserve existing routes and rankings unless evidence supports a change.
- Avoid keyword cannibalization with `aothunthongdiep.com` and `vietnamclothing.vn`; document risks instead of duplicating content.
- Lead quality over traffic-only SEO.

## Code touchpoints

| Area | Primary files |
|---|---|
| Canonical / indexation | `src/lib/seo/indexation-policy.ts`, `src/lib/seo/indexable-category-routes.ts` |
| Sitemap / robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| Structured data | `src/components/seo/*` |
| Public routes | `src/app/(public)/**` |
| Content ops (admin) | `src/features/content/services/seo-*.service.ts` |
