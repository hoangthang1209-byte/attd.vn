# Content Architecture & Keyword Intent Map

Phase 1 planning artifact for attd.vn B2B sourcing SEO.  
Search volume numbers are **not** included unless sourced from GSC/analytics — status reflects current site state as of 2026-09-22.

## Information architecture

```
Homepage (/)
├── Product discovery
│   ├── Catalog (/san-pham) — indexable hub; filters noindex
│   ├── Category index (/danh-muc-san-pham)
│   ├── Category landings (/{slug}) — allowlisted commercial pages
│   └── PDP (/san-pham/[slug])
├── Commercial / money pages
│   ├── Sourcing hub (/nguon-hang)
│   ├── Dealer program (/dai-ly, /chinh-sach-dai-ly)
│   ├── OEM (/oem)
│   ├── Corporate gifts (/qua-tang-doanh-nghiep)
│   ├── Industry intent cluster (/ao-thun-doanh-nghiep, /ao-thun-cong-ty, …)
│   └── Wholesale cluster (/ao-thun-tron-si, /kho-ao-thun-tron, …)
├── Knowledge / trust
│   ├── Material guides (/vai-cotton-2-chieu, /vai-cvc-la-gi, …)
│   ├── Sizing/color refs (/bang-mau-ao-thun-tron, /size-ao-thun-tron)
│   ├── About (/gioi-thieu)
│   └── Contact / RFQ (/lien-he)
└── Blog (/blog, /blog/[slug], /blog/danh-muc/[slug])
    └── Supporting articles → internal links to money pages
```

### Page role definitions

| Role | Goal | Primary CTA |
|---|---|---|
| Money page | Rank for commercial intent; drive RFQ/dealer signup | Form, Zalo, `/lien-he` |
| Category landing | Rank for product-type queries with curated copy | Browse products + RFQ |
| PDP | Long-tail product queries; support quoting | RFQ / contact |
| Knowledge article | Top/mid-funnel education | Link to relevant money page |
| Trust page | Credibility, E-E-A-T | Contact / case study |

---

## Keyword / intent map

Primary clusters aligned with business goals from Issue #99.

| Primary cluster | Search intent | Target page | Funnel | Internal link sources | Cannibalization risk | Content status |
|---|---|---|---|---|---|---|
| đồng phục doanh nghiệp | Commercial — uniform programs | `/ao-thun-doanh-nghiep`, `/ao-thun-nhan-vien` | Bottom | Homepage, footer, `/nguon-hang`, blog | Medium vs industry subpages | Live — copy refresh backlog |
| áo thun đồng phục | Commercial — t-shirt uniforms | `/ao-thun-tron` (category), `/ao-thun-doanh-nghiep` | Bottom | Header nav, wholesale cluster | Medium — catalog vs landing | Live |
| quà tặng doanh nghiệp | Commercial — corporate gifts | `/qua-tang-doanh-nghiep`, `/gift-set-doanh-nghiep` | Bottom | Footer, homepage pathways | Low on-site; watch cross-site | Live |
| nguồn hàng B2B / đại lý | Commercial — dealer sourcing | `/nguon-hang`, `/dai-ly` | Bottom | Header, footer, OEM | Low | Live |
| agency / xưởng in sourcing | Commercial — trade buyers | `/dai-ly`, `/oem`, `/nguon-hang` | Bottom | Header utility bar | Low | Live |
| nón / bandana / merchandise | Commercial — product category | `/non`, `/bandana` (+ alias slugs) | Mid–bottom | Header, category grid | **High** — alias pairs `/non` vs `/non-dong-phuc` | Live — consolidation backlog |
| túi tote / quà tặng | Commercial | `/tote`, `/tote-bag` | Mid–bottom | Header, gifts page | **High** — alias pair | Live — consolidation backlog |
| áo thun trơn sỉ / kho hàng | Commercial — wholesale blanks | `/ao-thun-tron-si`, `/kho-ao-thun-tron` | Bottom | Wholesale cluster cross-links | Low | Live |
| in / thêu / OEM | Commercial — customization | `/oem`, knowledge articles | Mid–bottom | Homepage OEM banner, `/nguon-hang` | Medium vs `/dai-ly` | Live |
| chất liệu vải (cotton, CVC, TC) | Informational → commercial | `/vai-cotton-2-chieu`, `/vai-cvc-la-gi`, `/vai-tc-la-gi` | Top–mid | Wholesale/knowledge cluster | Low | Live |
| bảng màu / size áo thun trơn | Informational → commercial | `/bang-mau-ao-thun-tron`, `/size-ao-thun-tron` | Top–mid | Wholesale cluster | Low | Live |
| blog kiến thức B2B | Informational | `/blog`, `/blog/[slug]` | Top–mid | Homepage teaser, header | Low if linked to money pages | Live — editorial pipeline |

### Cross-site cannibalization watchlist

| Topic | attd.vn target | Other ATTD properties | Action |
|---|---|---|---|
| Áo thun / đồng phục retail storytelling | B2B sourcing, MOQ, dealer | `aothunthongdiep.com` | Differentiate angle: wholesale/dealer/OEM on attd.vn |
| Export / manufacturing narrative | OEM, sourcing | `vietnamclothing.vn` | attd.vn focuses domestic B2B dealer/agency |
| Generic "best/cheapest" claims | Avoid unsupported superlatives | — | Factual B2B tone only |

---

## Internal linking principles

1. Every supporting article should link to **one primary money page** and optionally one category landing.
2. Category landings should link into wholesale/knowledge clusters via `InternalLinkBlock` (existing pattern).
3. Industry pages should cross-link to `/nguon-hang` and `/lien-he` (existing); lateral industry cross-links are backlog.
4. Use `publicCategoryHref()` so indexable categories resolve to `/{slug}` not filtered catalog URLs.

---

## Gaps → dedicated landing vs category page

| Gap | Recommendation | Rationale |
|---|---|---|
| "Đồng phục công ty" vs "đồng phục doanh nghiệp" | Keep separate industry pages; consolidate copy differentiation | Already have `/ao-thun-cong-ty` and `/ao-thun-doanh-nghiep` |
| Alias category slugs | Pick one canonical slug per product type | Avoid duplicate indexation |
| Event uniforms | `/ao-thun-su-kien` serves intent | No new page needed Phase 1 |
| Private-label deep dive | Expand `/oem` sections before new URL | Prefer depth over new routes |
