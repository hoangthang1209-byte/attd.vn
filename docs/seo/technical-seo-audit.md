# Technical SEO Audit — attd.vn (Phase 1)

Audit date: 2026-09-22  
Scope: public marketing routes under `src/app/(public)/**` and shared SEO utilities.

## Executive summary

ATTD already has a solid SEO foundation: centralized canonical host (`https://www.attd.vn`), tested catalog/blog indexation policies, curated category landing allowlists, dynamic sitemap generation, and structured data on key commercial templates.

Phase 1 gaps are mostly **consistency and discoverability** (portal crawl blocking, blog breadcrumb JSON-LD, homepage/landing OG parity, blog category sitemap entries) plus **planning artifacts** for keyword architecture and content backlog.

Risk level: **low–medium** (marketing/SEO layer only).

---

## 1. Metadata / title / description

| Surface | Status | Notes |
|---|---|---|
| Root layout defaults | ✅ | Branding-aware OG image via settings |
| Homepage `/` | ⚠️ → fixed in Phase 1 batch | Previously inherited root metadata only; now explicit title/description/OG |
| Catalog `/san-pham` | ✅ | Filter/pagination noindex via `buildCatalogMetadata` |
| Category landings `/{slug}` | ✅ | Index only when allowlisted |
| PDP `/san-pham/[slug]` | ✅ | Per-product title, description, canonical, OG |
| Blog article | ✅ | Supports per-post canonical override |
| Blog archive / category | ✅ | Pagination/filter noindex |
| Static commercial landings | ✅ | Inline `generateMetadata` |
| `/dai-ly` | ⚠️ → fixed in Phase 1 batch | Previously missing OG/Twitter |
| B2B portal `/portal/*` | ⚠️ → fixed in Phase 1 batch | Previously crawlable without noindex |

## 2. Canonical tags

- Canonical host is consistent: `https://www.attd.vn` (`src/lib/seo.ts`).
- Catalog filter URLs canonicalize to approved category landings or self when filtered.
- Blog supports editorial `canonicalUrl` override per post.
- Quote viewer pages use noindex; canonical on short-link path is a backlog item (low priority).

## 3. Index / noindex behavior

**Strong areas**

- Catalog substantive queries → noindex with documented canonical rules (tested in `indexation-policy.test.ts`).
- Blog pagination and tag filters → noindex.
- Tracking params (`utm_*`, `gclid`, etc.) → noindex with clean canonical.
- Private quote pages → noindex, nofollow.

**Gaps addressed in Phase 1 batch**

- `/portal/*` added to `robots.txt` disallow and portal layout `noindex`.

**Backlog (documented, not changed in Phase 1)**

- Category alias pairs both indexable (`/non` + `/non-dong-phuc`, `/tote` + `/tote-bag`, `/bandana` + `/khan-bandana`) — pick one canonical slug per cluster.
- `rel=prev/next` for paginated archives (Next.js Metadata API limitation; low priority).

## 4. Sitemap & robots

| Item | Status |
|---|---|
| `robots.txt` sitemap reference | ✅ |
| Static commercial paths | ✅ ~27 curated paths |
| DB categories (allowlisted) | ✅ |
| Published products | ✅ Excludes demo/sample metadata |
| Blog posts | ✅ |
| Blog category archives `/blog/danh-muc/*` | ⚠️ → added in Phase 1 batch (visible categories with published posts) |
| Filtered/paginated URLs | ✅ Correctly excluded |

`robots.txt` disallow list: `/admin/`, `/quan-tri/`, `/api/`, `/portal/` (Phase 1).

## 5. Structured data

| Schema | Coverage |
|---|---|
| Organization | ✅ All public pages (layout) |
| BreadcrumbList | ✅ Catalog, category, PDP, SEO landing templates |
| BreadcrumbList (blog) | ⚠️ → added in Phase 1 batch |
| CollectionPage / ItemList | ✅ Category + landing pages |
| FAQPage | ✅ Category, PDP, landings, blog |
| Article | ✅ Blog articles |
| Product | ✅ PDP (no `offers` — intentional for B2B RFQ model) |

**Backlog:** Align `ArticleSchema` publisher contact with dynamic org schema; add `CollectionPage` on blog category archives.

## 6. Pagination / filter URL behavior

Handled centrally in `src/lib/seo/indexation-policy.ts`. No platform-wide rewrite required.

## 7. Internal linking

**Global:** Header and footer link to money pages (`/nguon-hang`, `/oem`, `/dai-ly`, category landings, `/blog`).

**Page-level:** Category landings use `InternalLinkBlock` for wholesale/knowledge clusters; PDP breadcrumbs and related products; blog related posts.

**Gaps (backlog):**

- Footer fallback omits some category links unless CMS nav overrides.
- Industry landing pages do not cross-link laterally.
- Category alias pairs may split link equity.
- Blog templates lack systematic links to commercial landings (editorial workflow).

## 8. Heading hierarchy & image alt

- Landings generally use single H1 → section H2 pattern.
- Product/gallery images use product name or stored `altText`.
- Decorative UI images use `alt=""` where appropriate.

## 9. Performance / Core Web Vitals (code-visible)

| Risk | Notes |
|---|---|
| Medium | Public layout fetches branding, category tree, nav on many pages |
| Low–medium | Client header with scroll observers |
| Good | `revalidate = 3600` on most public pages |

No code changes in Phase 1; monitor via GSC CWV and Vercel analytics.

## 10. Duplicate / thin page risks

| Risk | Mitigation |
|---|---|
| Category alias URLs | Document in backlog; defer slug consolidation |
| Filtered catalog URLs | noindex + canonical rules ✅ |
| Cross-site cannibalization (ATTD-owned sites) | Document in content-architecture.md; no blind duplication |

## 11. hreflang

Single-locale Vietnamese site — no hreflang implemented (intentional).

---

## Phase 1 code batch (implemented)

1. Block `/portal/*` in robots + portal layout noindex.
2. Homepage explicit metadata + OG/Twitter.
3. `/dai-ly` OG/Twitter parity with other landings.
4. Blog breadcrumb `BreadcrumbList` JSON-LD on article + category archive pages.
5. Blog category archive URLs in sitemap (indexable categories with published posts).

## References

- GSC ops: `docs/operations/google-search-console.md`
- Indexation tests: `src/lib/seo/indexation-policy.test.ts`
- Category allowlist: `src/lib/seo/indexable-category-routes.ts`
