# SEO / Content Backlog (Prioritized)

Prioritized by **business relevance** and **lead quality**, not traffic volume alone.  
Status key: `done` | `in-progress` | `planned` | `deferred`

---

## P0 — Phase 1 batch (Issue #99)

| ID | Task | Type | Status | Notes |
|---|---|---|---|---|
| SEO-001 | Portal crawl block (`robots.txt` + layout noindex) | Technical | done | `/portal/*` |
| SEO-002 | Homepage explicit metadata + OG/Twitter | Technical | done | `/` |
| SEO-003 | `/dai-ly` OG/Twitter parity | Technical | done | Match `/oem` pattern |
| SEO-004 | Blog breadcrumb JSON-LD | Technical | done | Article + category archive |
| SEO-005 | Blog category URLs in sitemap | Technical | done | Visible categories with posts |
| SEO-006 | Planning docs (`docs/seo/*`) | Documentation | done | Audit, IA, backlog |

---

## P1 — Next safe implementation batch

| ID | Task | Type | Risk | Notes |
|---|---|---|---|---|
| SEO-101 | Consolidate category alias indexation | Technical | Medium | Pick canonical: `/non`, `/tote`, `/bandana`; noindex or redirect aliases |
| SEO-102 | Blog category `CollectionPage` schema | Technical | Low | `/blog/danh-muc/[slug]` |
| SEO-103 | Align `ArticleSchema` publisher with dynamic org | Technical | Low | Reuse `getOrganizationJsonLd()` |
| SEO-104 | Quote page canonical on short-link path | Technical | Low | Already noindex |
| SEO-105 | Footer fallback link parity | Internal links | Low | Add `/tote`, `/binh-giu-nhiet` to static footer |
| SEO-106 | Industry landing lateral cross-links | Internal links | Low | Link between `/ao-thun-*` pages |

---

## P2 — Content production (editorial)

| ID | Task | Type | Target | Notes |
|---|---|---|---|---|
| SEO-201 | Category landing copy refresh — áo thun trơn | Copy | `/ao-thun-tron` | MOQ, dealer angle, RFQ CTA |
| SEO-202 | Category landing copy refresh — quà tặng | Copy | `/qua-tang-doanh-nghiep` | Use cases, packaging |
| SEO-203 | OEM page section expansion | Copy | `/oem` | Private label workflow detail |
| SEO-204 | Blog → money page link template | Editorial | Blog CMS | Standard CTA block in articles |
| SEO-205 | Case study / trust page | New content | TBD route | Social proof without unsupported claims |
| SEO-206 | Dealer landing FAQ expansion | Copy | `/dai-ly` | Onboarding, catalogue access stages |

---

## P3 — Monitoring & optimization

| ID | Task | Type | Notes |
|---|---|---|---|
| SEO-301 | GSC coverage review for new sitemap entries | Ops | After deploy |
| SEO-302 | CWV baseline from Search Console | Ops | See `docs/operations/google-search-console.md` |
| SEO-303 | Internal link coverage dashboard review | Ops | Admin `SeoInternalLinkCoverage` |
| SEO-304 | `rel=prev/next` for blog pagination | Technical | Low priority; Metadata API limits |
| SEO-305 | Product schema `offers` evaluation | Technical | Only if public pricing policy changes |

---

## Deferred / out of scope for SEO lane

- Visual redesign of public pages
- CRM, Prisma, auth, pricing, payment changes
- Mass AI blog generation
- Platform-wide SEO rewrite
- hreflang (single locale)
- Unsupported superlative claims ("số 1", "tốt nhất")

---

## Suggested next task after Phase 1 merge

**SEO-101**: Resolve category alias duplicate indexation (`non`/`non-dong-phuc`, `tote`/`tote-bag`, `bandana`/`khan-bandana`) — highest remaining technical SEO risk on attd.vn.
